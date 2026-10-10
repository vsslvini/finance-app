// Testes da tela Início, que busca o resumo do mês no backend e mostra os
// números. fireEvent simula ações do usuário (tocar, digitar); waitFor
// espera uma conferência passar; render e screen já apareceram nos testes
// antigos.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { buscarResumo, type Resumo } from '@/api';
import InicioScreen from '@/app/index';

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

// Nomes que o leitor de tela anuncia para os dois cartões que abrem folhas.
// Com eles achamos os botões do jeito que uma pessoa usando o TalkBack acharia.
const BOTAO_SALDO = 'Saldo: 1.250,50 reais';
const BOTAO_FATURA = 'Fatura aberta: 499,90 reais';

const ENDERECO_CONFIGURACOES = 'http://servidor-falso:8000/api/configuracoes/';

// Dados falsos no mesmo formato do GET /api/resumo/ (ResumoSerializer do
// backend). Os valores vêm como texto, como o backend manda.
const RESUMO_DE_EXEMPLO: Resumo = {
  mes: '2026-10',
  saldo_total: '1250.50',
  fatura_aberta: '499.90',
  entradas: '3000.00',
  saidas: '1830.45',
  posso_gastar_por_dia: '31.31',
  dia_do_mes: 12,
  dias_no_mes: 31,
  limite_fatura: null,
  fatura_acima_do_limite: false,
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
      categoria: 'Transportation',
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

// Configurações falsas no formato do GET /api/configuracoes/: quantos dias
// antes do dia 1 o mês começa e o limite da fatura (null = sem limite).
// Usamos 3 dias (e não 0) para ter certeza de que o campo mostra o valor que
// veio do servidor, e não um zero qualquer.
const CONFIGURACOES_DE_EXEMPLO = { dias_antes_do_mes: 3, limite_fatura: null };

// Monta uma resposta falsa do servidor. Uma Response de verdade tem dezenas
// de campos, mas o app só usa três: ok (deu certo?), status (200, 400, 401,
// 500) e json() (o corpo da resposta). Pick<Response, ...> é o tipo "só esses
// três campos da Response". No fim dizemos ao TypeScript "trate isto como uma
// Response" (o "as Response"); ele aceita porque os três campos têm os tipos
// certos, e não precisamos de any. O corpo (dados) é unknown porque pode ser
// um resumo, as configurações ou uma mensagem de erro.
function respostaFalsa(status: number, dados?: unknown): Response {
  const parcial: Pick<Response, 'ok' | 'status' | 'json'> = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => dados,
  };
  return parcial as Response;
}

// ---------------------------------------------------------------------------
// Um servidor falso que responde conforme o endereço
//
// Nos testes das folhas, a tela faz três pedidos diferentes: GET do resumo,
// GET das configurações e PATCH das configurações. O mockResolvedValue
// devolveria a mesma resposta para todos. Com mockImplementation passamos
// uma função nossa, que o dublê roda a cada chamada com os mesmos argumentos
// do fetch (endereço e opções). Olhando o endereço e o método
// (opcoes?.method; sem método, o fetch faz GET) escolhemos a resposta, como
// um backend de mentira. O "?." é para quando opções não vierem.
//
// patch é a resposta do PATCH; por padrão "deu certo" (200). O teste do erro
// 400 passa outra.
// ---------------------------------------------------------------------------
function ligarServidorFalso(patch: Response = respostaFalsa(200, CONFIGURACOES_DE_EXEMPLO)) {
  fetchFalso.mockImplementation(async (endereco, opcoes) => {
    const url = String(endereco);
    if (url.includes('/api/resumo/')) {
      return respostaFalsa(200, criarResumo());
    }
    if (url.includes('/api/configuracoes/') && opcoes?.method === 'PATCH') {
      return patch;
    }
    if (url.includes('/api/configuracoes/')) {
      return respostaFalsa(200, CONFIGURACOES_DE_EXEMPLO);
    }
    // Um endereço que não esperávamos: falha alto, para o erro ficar claro.
    throw new Error(`Endereço inesperado no teste: ${url}`);
  });
}

// Lê as anotações do dublê (fetchFalso.mock.calls, a lista de chamadas, cada
// uma com [endereço, opções]) e separa só as que interessam.
function chamadasPatch() {
  return fetchFalso.mock.calls.filter(([, opcoes]) => opcoes?.method === 'PATCH');
}

function chamadasDoResumo() {
  return fetchFalso.mock.calls.filter(([endereco]) => String(endereco).includes('/api/resumo/'));
}

// O corpo do primeiro PATCH, de volta de texto JSON para objeto. A tela manda
// JSON.stringify({...}); o JSON.parse desfaz isso, para compararmos objetos
// com toEqual em vez de comparar textos (a ordem dos espaços não importa).
function corpoDoPatch(): unknown {
  const [, opcoes] = chamadasPatch()[0];
  return JSON.parse(String(opcoes?.body));
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

  it('mostra o mês do resumo, o "posso gastar por dia" e os totais', async () => {
    // Prepara: mockResolvedValue faz o fetch falso devolver (com sucesso)
    // a resposta que escolhemos, toda vez que for chamado. Usamos março
    // (e não outubro, o mês de hoje) para provar que o título vem do campo
    // mes do resumo, e não da data do celular.
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo({ mes: '2026-03' })));

    await render(<InicioScreen />);

    // findByText espera o texto aparecer (tenta de novo por até 1 s). Usamos
    // ele porque os números só aparecem depois que a resposta "chega".
    expect(await screen.findByText('R$ 1.250,50')).toBeOnTheScreen();

    // O título aparece em MAIÚSCULAS no celular, mas isso é só estilo
    // (textTransform); o texto continua "Março de 2026".
    expect(screen.getByText('Março de 2026')).toBeOnTheScreen();

    // O "posso gastar" é um Text com outro Text dentro (os centavos menores).
    // A Testing Library junta o texto de Texts aninhados, como o celular
    // desenha, então procuramos o valor inteiro.
    expect(screen.getByText('R$ 31,31')).toBeOnTheScreen();
    expect(screen.getByText('R$ 499,90')).toBeOnTheScreen();
    expect(screen.getByText('+ R$ 3.000,00')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 1.830,45')).toBeOnTheScreen();
  });

  it('mostra os rótulos dos cartões e o dia do mês', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    // Espera o resumo chegar; depois tudo já está na tela (getByText).
    expect(await screen.findByText('Posso gastar por dia')).toBeOnTheScreen();
    expect(screen.getByText('Saldo')).toBeOnTheScreen();
    expect(screen.getByText('Fatura aberta')).toBeOnTheScreen();
    expect(screen.getByText('Entrou')).toBeOnTheScreen();
    expect(screen.getByText('Saiu')).toBeOnTheScreen();
    // dia_do_mes 12 e dias_no_mes 31 no RESUMO_DE_EXEMPLO
    expect(screen.getByText('dia 12 de 31')).toBeOnTheScreen();
  });

  it('com a fatura acima do limite, mostra o aviso com o limite', async () => {
    fetchFalso.mockResolvedValue(
      respostaFalsa(
        200,
        criarResumo({ limite_fatura: '1000.00', fatura_acima_do_limite: true }),
      ),
    );

    await render(<InicioScreen />);

    expect(
      await screen.findByText('A fatura passou do limite de R$ 1.000,00.'),
    ).toBeOnTheScreen();
  });

  it('com a fatura dentro do limite, não mostra o aviso', async () => {
    // Mesmo limite, mas o backend diz que a fatura não passou dele.
    fetchFalso.mockResolvedValue(
      respostaFalsa(
        200,
        criarResumo({ limite_fatura: '1000.00', fatura_acima_do_limite: false }),
      ),
    );

    await render(<InicioScreen />);
    // Espera a tela terminar de carregar antes de conferir a ausência; senão
    // o aviso "não estaria" só porque nada chegou ainda.
    await screen.findByText('R$ 1.250,50');

    // queryByText devolve null quando não acha (o getByText daria erro).
    // O /.../ é uma expressão regular: qualquer texto que contenha esse trecho.
    expect(screen.queryByText(/A fatura passou do limite/)).toBeNull();
  });

  it('mostra cada gasto com ícone, descrição, valor e detalhes, na ordem da API', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    // Primeiro gasto (Groceries tem o ícone de mercado, sigla "ME").
    // A sigla fica escondida do leitor de tela (o rótulo do gasto já fala a
    // categoria), e a Testing Library ignora o que está escondido. Por isso
    // pedimos includeHiddenElements: "procure também nos escondidos".
    expect(await screen.findByText('Mercado')).toBeOnTheScreen();
    expect(screen.getByText('ME', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('- R$ 45,90')).toBeOnTheScreen();
    expect(screen.getByText('08/10 · Nubank · Groceries')).toBeOnTheScreen();

    // Segundo gasto (Transportation tem o ícone de transporte, sigla "TR")
    expect(screen.getByText('Uber')).toBeOnTheScreen();
    expect(screen.getByText('TR', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('- R$ 18,70')).toBeOnTheScreen();
    expect(screen.getByText('07/10 · Inter · Transportation')).toBeOnTheScreen();

    // Ordem: getAllByText devolve todos os elementos que combinam, na ordem
    // em que aparecem na tela (de cima para baixo). / · / é uma expressão
    // regular que pega qualquer texto com " · ", ou seja, as linhas de
    // detalhes dos gastos.
    const linhasDeDetalhes = screen.getAllByText(/ · /);
    expect(linhasDeDetalhes).toHaveLength(2);
    expect(linhasDeDetalhes[0]).toHaveTextContent('08/10 · Nubank · Groceries');
    expect(linhasDeDetalhes[1]).toHaveTextContent('07/10 · Inter · Transportation');
  });

  it('sem gastos, avisa "Nenhum gasto neste mês ainda." e mantém os totais', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo({ ultimos_gastos: [] })));

    await render(<InicioScreen />);

    expect(await screen.findByText('Nenhum gasto neste mês ainda.')).toBeOnTheScreen();
    // A lista vazia não pode esconder o resto do resumo.
    expect(screen.getByText('R$ 1.250,50')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 1.830,45')).toBeOnTheScreen();
  });

  it('com "posso gastar por dia" negativo, mostra o valor sem o aviso antigo da fatura', async () => {
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ posso_gastar_por_dia: '-10.00' })),
    );

    await render(<InicioScreen />);

    expect(await screen.findByText('- R$ 10,00')).toBeOnTheScreen();
    // O aviso antigo saiu da tela no módulo 4b; o vermelho do número já diz
    // que o dinheiro não basta.
    expect(screen.queryByText('A fatura aberta é maior que o saldo.')).toBeNull();
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
    // Tentar de novo não adianta: o token errado continuaria errado.
    expect(screen.queryByText('Tentar de novo')).toBeNull();
  });

  it('com erro no servidor (500), avisa e oferece "Tentar de novo"', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(500));

    await render(<InicioScreen />);

    expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeOnTheScreen();
    expect(screen.getByText('Tentar de novo')).toBeOnTheScreen();
  });

  it('o leitor de tela lê o que saiu no mês em reais', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    await screen.findByText('R$ 1.250,50');

    // getByLabelText procura pelo accessibilityLabel, o texto que o leitor de
    // tela (TalkBack, VoiceOver) fala em voz alta.
    expect(screen.getByLabelText('Saiu no mês: 1.830,45 reais')).toBeOnTheScreen();
  });

  it('os cartões Saldo e Fatura aberta são botões, com dica para o leitor de tela', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    // findByRole acha o elemento com papel de botão e com esse nome. Se o
    // cartão não fosse um botão, não seria achado: é o que garante que o
    // TalkBack anuncia "botão" e que dá para tocar nele.
    const saldo = await screen.findByRole('button', { name: BOTAO_SALDO });
    const fatura = screen.getByRole('button', { name: BOTAO_FATURA });

    // A dica (accessibilityHint) é a frase que o leitor de tela fala depois
    // do nome, explicando o que o toque faz. A Testing Library não tem um
    // comparador próprio para a dica, então usamos o toHaveProp, que confere
    // uma propriedade do elemento (a documentação o indica quando nenhum
    // outro comparador serve).
    expect(saldo).toHaveProp('accessibilityHint', 'Toque para mudar o início do mês');
    expect(fatura).toHaveProp('accessibilityHint', 'Toque para mudar o limite da fatura');
  });
});

// ---------------------------------------------------------------------------
// As folhas de edição
//
// A folha é um Modal do React Native (uma janela por cima da tela). No Jest,
// o React Native troca o Modal por uma versão simples: aberto (visible), ele
// mostra o conteúdo e a Testing Library acha os textos normalmente; fechado,
// ele não desenha nada. Por isso, para conferir que a folha fechou, basta
// ver que o título dela sumiu (queryByText devolve null).
// ---------------------------------------------------------------------------
describe('Folha "Início do mês"', () => {
  it('tocar em Saldo abre a folha com o valor atual do servidor', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);

    // Faz: toca no cartão Saldo.
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_SALDO }));

    // Verifica: o título da folha aparece...
    expect(await screen.findByText('Início do mês')).toBeOnTheScreen();
    // ...e o campo mostra o valor que veio do GET /api/configuracoes/ (3).
    // waitFor repete a conferência (a cada 50 ms, por até 1 s) até passar,
    // porque as configurações chegam um pouco depois de a folha abrir.
    // toHaveDisplayValue confere o texto que está dentro do campo.
    await waitFor(() =>
      expect(screen.getByLabelText('Dias antes do dia 1')).toHaveDisplayValue('3'),
    );
  });

  it('salvar "2" manda um PATCH com dias_antes_do_mes 2', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_SALDO }));
    // Espera as configurações chegarem, para o valor do servidor não
    // sobrescrever o que vamos digitar.
    await waitFor(() =>
      expect(screen.getByLabelText('Dias antes do dia 1')).toHaveDisplayValue('3'),
    );

    // Faz: fireEvent.changeText simula a pessoa digitando no campo (troca o
    // texto inteiro por "2"); depois toca em Salvar.
    await fireEvent.changeText(screen.getByLabelText('Dias antes do dia 1'), '2');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    // Verifica: houve um PATCH (esperamos com waitFor, porque ele é assíncrono)...
    await waitFor(() => expect(chamadasPatch()).toHaveLength(1));
    // ...no endereço certo, com o token e o aviso de que o corpo é JSON...
    const [endereco, opcoes] = chamadasPatch()[0];
    expect(endereco).toBe(ENDERECO_CONFIGURACOES);
    expect(opcoes).toMatchObject({
      headers: { Authorization: 'Token token-falso', 'Content-Type': 'application/json' },
    });
    // ...e com o número 2 (número, não o texto "2").
    expect(corpoDoPatch()).toEqual({ dias_antes_do_mes: 2 });
  });

  it('depois de salvar, fecha a folha e busca o resumo de novo', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_SALDO }));
    await waitFor(() =>
      expect(screen.getByLabelText('Dias antes do dia 1')).toHaveDisplayValue('3'),
    );

    await fireEvent.changeText(screen.getByLabelText('Dias antes do dia 1'), '2');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    // Verifica: o resumo foi pedido duas vezes (ao abrir a tela e depois de
    // salvar), porque mudar o início do mês muda as contas do resumo...
    await waitFor(() => expect(chamadasDoResumo()).toHaveLength(2));
    // ...e a folha fechou (o título sumiu).
    await waitFor(() => expect(screen.queryByText('Início do mês')).toBeNull());
  });

  it('"Cancelar" fecha a folha sem mandar nada ao servidor', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_SALDO }));
    await screen.findByText('Início do mês');

    // Faz: digita um valor novo, mas desiste.
    await fireEvent.changeText(screen.getByLabelText('Dias antes do dia 1'), '5');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    // Verifica: a folha fechou e nenhum PATCH foi feito.
    await waitFor(() => expect(screen.queryByText('Início do mês')).toBeNull());
    expect(chamadasPatch()).toHaveLength(0);
  });
});

describe('Folha "Limite da fatura"', () => {
  it('salvar "1.000,00" manda um PATCH com limite_fatura "1000.00"', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);

    // Faz: toca em Fatura aberta, digita o limite no formato brasileiro e salva.
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_FATURA }));
    const campo = await screen.findByLabelText('Limite da fatura em reais');
    await fireEvent.changeText(campo, '1.000,00');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    // Verifica: o valor vai ao backend no formato dele (ponto nos centavos,
    // como texto, para não perder centavos).
    await waitFor(() => expect(chamadasPatch()).toHaveLength(1));
    expect(corpoDoPatch()).toEqual({ limite_fatura: '1000.00' });
  });

  it('salvar com o campo vazio manda limite_fatura null (sem limite)', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_FATURA }));
    const campo = await screen.findByLabelText('Limite da fatura em reais');
    // Faz: apaga tudo do campo e salva.
    await fireEvent.changeText(campo, '');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(chamadasPatch()).toHaveLength(1));
    expect(corpoDoPatch()).toEqual({ limite_fatura: null });
  });

  it('quando o servidor recusa (400), mostra a mensagem e a folha continua aberta', async () => {
    // Prepara: o PATCH responde 400 com o formato de erro do DRF,
    // { campo: [mensagens] }. Quem decide recusar aqui é o servidor falso;
    // por isso digitamos um valor válido: o teste é sobre a tela mostrar a
    // recusa do backend, e não sobre a validação do próprio app.
    ligarServidorFalso(
      respostaFalsa(400, { limite_fatura: ['O limite da fatura não pode ser negativo.'] }),
    );
    await render(<InicioScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_FATURA }));
    const campo = await screen.findByLabelText('Limite da fatura em reais');
    await fireEvent.changeText(campo, '1.000,00');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    // Verifica: a mensagem do backend aparece...
    expect(
      await screen.findByText('O limite da fatura não pode ser negativo.'),
    ).toBeOnTheScreen();
    // ...e a folha não fechou, para a pessoa corrigir o valor.
    expect(screen.getByText('Limite da fatura')).toBeOnTheScreen();
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
