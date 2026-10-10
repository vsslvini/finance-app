// Testes da tela Início, que busca o resumo do mês no backend e mostra os
// números. fireEvent simula um toque do usuário; os outros já apareceram nos
// testes antigos (render e screen).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { buscarResumo, type Resumo } from '@/api';
import InicioScreen from '@/app/index';
import { nomeDoMes } from '@/formatacao';

// ---------------------------------------------------------------------------
// O que é um mock (dublê)
//
// A tela chama o fetch, a função do JavaScript que faz pedidos pela rede. Nos
// testes não queremos rede de verdade: o backend pode estar desligado, os
// dados mudam e o teste ficaria lento e instável. Então trocamos o fetch por
// um "dublê" (mock): uma função falsa que devolve a resposta que nós
// escolhemos e que anota cada vez que foi chamada, e com quais argumentos.
// É a mesma ideia do monkeypatch do pytest, que usamos no backend para fingir
// a Pluggy.
//
// jest.fn() cria essa função falsa. Os tipos entre < > dizem ao TypeScript
// que ela tem a mesma "cara" do fetch: recebe (endereço, opções) e devolve
// uma Promise de Response.
// ---------------------------------------------------------------------------
type ParametrosDoFetch = [input: RequestInfo | URL, init?: RequestInit];
let fetchFalso: jest.Mock<Promise<Response>, ParametrosDoFetch>;

// Guardamos os valores de verdade para devolver tudo como estava no fim.
const fetchOriginal = globalThis.fetch;
const urlOriginal = process.env.EXPO_PUBLIC_API_URL;
const tokenOriginal = process.env.EXPO_PUBLIC_API_TOKEN;

// Textos que aparecem em mais de um teste.
const MENSAGEM_CONEXAO =
  'Não foi possível conectar ao servidor. Confira se o backend está rodando e se o celular está na mesma rede.';
const MENSAGEM_TOKEN = 'Acesso negado pelo servidor. Confira o token no arquivo .env do app.';
const MENSAGEM_SERVIDOR = 'O servidor teve um erro. Tente de novo em instantes.';

// Dados falsos no mesmo formato do GET /api/resumo/ (ResumoSerializer do
// backend). Os valores vêm como texto, como o backend manda.
const RESUMO_DE_EXEMPLO: Resumo = {
  saldo_total: '1250.50',
  fatura_aberta: '499.90',
  entradas: '3000.00',
  saidas: '1830.45',
  posso_gastar_por_dia: '31.31',
  ultimos_gastos: [
    {
      id: 812,
      data: '2026-10-08',
      descricao: 'Mercado',
      valor: '-45.90',
      conta: 1,
      nome_conta: 'Conta corrente',
      nome_banco: 'Nubank',
      categoria: 'Groceries',
      parcela_atual: null,
      total_parcelas: null,
    },
    {
      id: 811,
      data: '2026-10-07',
      descricao: 'Uber',
      valor: '-18.70',
      conta: 2,
      nome_conta: 'Conta',
      nome_banco: 'Inter',
      categoria: 'Transport',
      parcela_atual: null,
      total_parcelas: null,
    },
  ],
};

// Monta um resumo a partir do exemplo, trocando só o que o teste precisa.
// Ex.: criarResumo({ ultimos_gastos: [] }) é o exemplo sem gastos.
function criarResumo(mudancas: Partial<Resumo> = {}): Resumo {
  return { ...RESUMO_DE_EXEMPLO, ...mudancas };
}

// Monta uma resposta falsa do servidor. Uma Response de verdade tem dezenas
// de campos, mas a tela só usa três: ok (deu certo?), status (200, 401, 500)
// e json() (o corpo da resposta). Pick<Response, ...> é o tipo "só esses três
// campos da Response". No fim dizemos ao TypeScript "trate isto como uma
// Response" (o "as Response"); ele aceita porque os três campos têm os tipos
// certos, e não precisamos de any.
function respostaFalsa(status: number, dados?: Resumo): Response {
  const parcial: Pick<Response, 'ok' | 'status' | 'json'> = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => dados,
  };
  return parcial as Response;
}

// beforeEach roda antes de CADA teste deste arquivo, e afterEach depois de
// cada um. É parecido com uma fixture do pytest com yield: o beforeEach é a
// parte antes do yield (preparar) e o afterEach a parte depois (limpar).
// Assim cada teste começa do zero e um não atrapalha o outro.
beforeEach(() => {
  // Um fetch falso novinho, sem chamadas anotadas de outro teste.
  fetchFalso = jest.fn<Promise<Response>, ParametrosDoFetch>();
  globalThis.fetch = fetchFalso;

  // Endereço e token falsos, para não depender do .env de quem roda o teste.
  process.env.EXPO_PUBLIC_API_URL = 'http://servidor-falso:8000';
  process.env.EXPO_PUBLIC_API_TOKEN = 'token-falso';
});

afterEach(() => {
  // Devolve o fetch de verdade.
  globalThis.fetch = fetchOriginal;

  // Devolve as variáveis como estavam. Se não existiam, apagamos (atribuir
  // undefined poderia virar o texto "undefined").
  if (urlOriginal === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = urlOriginal;
  }
  if (tokenOriginal === undefined) {
    delete process.env.EXPO_PUBLIC_API_TOKEN;
  } else {
    process.env.EXPO_PUBLIC_API_TOKEN = tokenOriginal;
  }

  // Se algum teste ligou o relógio falso, volta ao relógio de verdade.
  jest.useRealTimers();
});

describe('Tela Início', () => {
  it('mostra "Carregando o resumo..." enquanto a resposta não chega', async () => {
    // Relógio falso: a busca liga um timer de 15 s; com o relógio falso ele
    // nunca dispara de verdade e é descartado no afterEach, em vez de deixar
    // o Jest esperando 15 s no fim.
    jest.useFakeTimers();

    // Prepara: um fetch que nunca termina (uma Promise que nunca resolve),
    // para a tela ficar parada no "carregando".
    fetchFalso.mockReturnValue(new Promise<Response>(() => {}));

    await render(<InicioScreen />);

    // Verifica: o aviso de carregamento está na tela.
    expect(screen.getByText('Carregando o resumo...')).toBeOnTheScreen();
  });

  it('mostra o mês atual, o "posso gastar por dia" e os totais', async () => {
    // Prepara: mockResolvedValue faz o fetch falso devolver (com sucesso)
    // a resposta que escolhemos, toda vez que for chamado.
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    // findByText espera o texto aparecer (tenta de novo por até 1 s). Usamos
    // ele porque os números só aparecem depois que a resposta "chega".
    expect(await screen.findByText('R$ 1.250,50')).toBeOnTheScreen();

    // O título é o mês de hoje. Calculamos o esperado com a própria data de
    // hoje e o nomeDoMes (que tem seus testes em formatacao-test.ts), em vez
    // de fixar a data com relógio falso: assim o teste vale em qualquer mês
    // e não mexe nos timers de que o findByText depende.
    const hoje = new Date();
    const tituloEsperado = nomeDoMes(hoje.getFullYear(), hoje.getMonth() + 1);
    expect(screen.getByText(tituloEsperado)).toBeOnTheScreen();

    expect(screen.getByText('Posso gastar por dia')).toBeOnTheScreen();
    expect(screen.getByText('R$ 31,31')).toBeOnTheScreen();
    expect(screen.getByText('R$ 499,90')).toBeOnTheScreen();
    expect(screen.getByText('+ R$ 3.000,00')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 1.830,45')).toBeOnTheScreen();
  });

  it('mostra cada gasto com descrição, valor e detalhes, na ordem da API', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    // Primeiro gasto
    expect(await screen.findByText('Mercado')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 45,90')).toBeOnTheScreen();
    expect(screen.getByText('08/10 · Nubank · Groceries')).toBeOnTheScreen();

    // Segundo gasto
    expect(screen.getByText('Uber')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 18,70')).toBeOnTheScreen();
    expect(screen.getByText('07/10 · Inter · Transport')).toBeOnTheScreen();

    // Ordem: getAllByText devolve todos os elementos que combinam, na ordem
    // em que aparecem na tela (de cima para baixo). / · / é uma expressão
    // regular que pega qualquer texto com " · ", ou seja, as linhas de
    // detalhes dos gastos.
    const linhasDeDetalhes = screen.getAllByText(/ · /);
    expect(linhasDeDetalhes).toHaveLength(2);
    expect(linhasDeDetalhes[0]).toHaveTextContent('08/10 · Nubank · Groceries');
    expect(linhasDeDetalhes[1]).toHaveTextContent('07/10 · Inter · Transport');
  });

  it('sem gastos, avisa "Nenhum gasto neste mês ainda." e mantém os totais', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo({ ultimos_gastos: [] })));

    await render(<InicioScreen />);

    expect(await screen.findByText('Nenhum gasto neste mês ainda.')).toBeOnTheScreen();
    // A lista vazia não pode esconder o resto do resumo.
    expect(screen.getByText('R$ 1.250,50')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 1.830,45')).toBeOnTheScreen();
  });

  it('com "posso gastar por dia" negativo, mostra o valor e o aviso da fatura', async () => {
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ posso_gastar_por_dia: '-10.00' })),
    );

    await render(<InicioScreen />);

    expect(await screen.findByText('- R$ 10,00')).toBeOnTheScreen();
    expect(screen.getByText('A fatura aberta é maior que o saldo.')).toBeOnTheScreen();
  });

  it('pede o resumo no endereço do .env, com o token no cabeçalho', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    // Espera a tela terminar, para a busca ter acontecido por completo.
    await screen.findByText('R$ 1.250,50');

    // O mock anota cada chamada em fetchFalso.mock.calls: uma lista de
    // chamadas, e cada chamada é a lista de argumentos. [0] é a primeira.
    const [endereco, opcoes] = fetchFalso.mock.calls[0];
    expect(endereco).toBe('http://servidor-falso:8000/api/resumo/');
    // toMatchObject confere só os campos que listamos e ignora o resto (como
    // o signal, que serve para cancelar a busca).
    expect(opcoes).toMatchObject({ headers: { Authorization: 'Token token-falso' } });
  });

  it('sem conexão, avisa e permite tentar de novo', async () => {
    // Prepara duas respostas, uma para cada chamada ("Once" = só uma vez):
    // na 1ª o fetch falha como se não houvesse rede (mockRejectedValueOnce
    // faz a Promise dar erro); na 2ª, dá certo.
    fetchFalso
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    expect(await screen.findByText(MENSAGEM_CONEXAO)).toBeOnTheScreen();

    // Faz: toca no botão. getByRole procura pelo papel ("button") e pelo
    // nome que o leitor de tela anunciaria. Na versão 14 o fireEvent.press é
    // assíncrono, por isso o await.
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    // Verifica: a tela buscou de novo e agora mostra o resumo.
    expect(await screen.findByText('R$ 1.250,50')).toBeOnTheScreen();
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it('com token recusado (401), avisa sobre o token e não oferece "Tentar de novo"', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(401));

    await render(<InicioScreen />);

    expect(await screen.findByText(MENSAGEM_TOKEN)).toBeOnTheScreen();
    // queryByText devolve null quando não acha (o getByText daria erro).
    // Tentar de novo não adianta: o token errado continuaria errado.
    expect(screen.queryByText('Tentar de novo')).toBeNull();
  });

  it('com erro no servidor (500), avisa e oferece "Tentar de novo"', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(500));

    await render(<InicioScreen />);

    expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeOnTheScreen();
    expect(screen.getByText('Tentar de novo')).toBeOnTheScreen();
  });

  it('o leitor de tela lê as saídas do mês em reais', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    await screen.findByText('R$ 1.250,50');

    // getByLabelText procura pelo accessibilityLabel, o texto que o leitor de
    // tela (TalkBack, VoiceOver) fala em voz alta.
    expect(screen.getByLabelText('Saídas do mês: 1.830,45 reais')).toBeOnTheScreen();
  });
});

describe('buscarResumo', () => {
  // Testamos a função direto (sem tela), porque o limite de tempo mora nela e
  // fica mais simples: não precisamos esperar nada aparecer na tela.
  it('desiste depois de 15 segundos sem resposta e dá erro de conexão', async () => {
    // Relógio falso: em vez de esperar 15 s de verdade, nós "adiantamos" o
    // relógio na hora que quisermos.
    jest.useFakeTimers();

    // Prepara: um fetch que só termina (com erro) quando a busca é
    // cancelada. O signal é o "botão de cancelar" que a função entrega ao
    // fetch; quando ela cancela, o signal dispara o evento "abort".
    let sinal: AbortSignal | null | undefined;
    fetchFalso.mockImplementation(
      (_endereco, opcoes) =>
        new Promise<Response>((_resolver, rejeitar) => {
          sinal = opcoes?.signal;
          sinal?.addEventListener('abort', () => rejeitar(new Error('cancelado')));
        }),
    );

    // Faz: começa a busca (sem await, porque ela só termina lá na frente).
    const promessa = buscarResumo();
    // Já deixamos combinado o que esperamos dela: que falhe (rejects) com um
    // erro do tipo "conexao".
    const verificacao = expect(promessa).rejects.toMatchObject({ tipo: 'conexao' });

    // Um milésimo antes do limite, a busca ainda não pode ter sido cancelada.
    await jest.advanceTimersByTimeAsync(14999);
    expect(sinal?.aborted).toBe(false);

    // Completa os 15 s: agora a busca é cancelada e a função dá erro.
    await jest.advanceTimersByTimeAsync(1);
    await verificacao;
  });
});
