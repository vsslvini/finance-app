// Testes da tela Início, que busca o resumo do mês no backend e mostra os
// números. fireEvent simula ações do usuário (tocar, digitar); waitFor
// espera uma conferência passar; act (novo no módulo 3b-2) roda um pedaço de
// código e espera a tela terminar de se atualizar; render e screen já
// apareceram nos testes antigos.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { RefreshControlProps } from 'react-native';

import {
  buscarResumo,
  type GastoResumo,
  type Guardado,
  type PlanoDeGuardar,
  type Previsto,
  type Resumo,
} from '@/api';
// Desde o módulo 6, a tela Início mora no grupo das abas: (abas)/index.tsx.
import InicioScreen from '@/app/(abas)/index';

// Dublê do pacote de ícones (a ideia do jest.mock está no rotas-test.tsx).
// O ícone de verdade é um Text que só desenha depois de carregar a fonte
// Lucide; com o Expo, essa carga é assíncrona e terminaria no meio do teste,
// fora do nosso controle. O ícone falso é um Text simples com o nome do ícone,
// desenhado na hora. Os testes conferem o círculo (pelo testID), não o desenho.
// Usamos jest.requireActual e React.createElement (em vez de JSX) porque o
// Jest move o jest.mock para o topo do arquivo, e lá a fábrica não pode usar
// nada de fora dela, nem os imports.
jest.mock('@react-native-vector-icons/lucide', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  // ...resto guarda as outras propriedades (como a que esconde o ícone do
  // leitor de tela) e as repassa ao Text, para o falso se comportar igual.
  function IconeFalso({ name, ...resto }: { name: string }) {
    return React.createElement(Text, resto, name);
  }
  // O pacote exporta o mesmo componente de dois jeitos (padrão e com nome
  // Lucide); o dublê oferece os dois, seja qual for o import da tela.
  return { __esModule: true, default: IconeFalso, Lucide: IconeFalso };
});

// Dublê só do useFocusEffect do Expo Router. Aqui a tela Início é desenhada
// sozinha, fora de um navegador, e o useFocusEffect de verdade precisa de um
// (ele escuta o evento "a aba ganhou foco"). O resto do expo-router continua o
// de verdade (jest.requireActual). Reler o resumo ao ganhar foco é conferido
// no rotas-test.tsx, que monta o app com o navegador de verdade (14b, caso 15).
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: () => {},
}));

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
const BOTAO_ENTROU = 'Entrou no mês: 3.000,00 reais';
const BOTAO_FATURA = 'Fatura aberta: 499,90 reais';
// O Saldo tem nome para o leitor de tela, mas não é mais botão.
const ROTULO_SALDO = 'Saldo: 1.250,50 reais';

// A seção "Guardado" também é um botão (abre a folha do plano). Este é o nome
// dela com o resumo padrão dos testes, em que o total guardado é 0,00.
const BOTAO_GUARDADO = 'Guardado: 0,00 reais';

const ENDERECO_CONFIGURACOES = 'http://servidor-falso:8000/api/configuracoes/';
const ENDERECO_PLANO = 'http://servidor-falso:8000/api/plano/';
const ENDERECO_RESUMO = 'http://servidor-falso:8000/api/resumo/';
const ENDERECO_SINCRONIZAR = 'http://servidor-falso:8000/api/sincronizar/';

// O aviso que aparece quando "puxar para baixo" não consegue atualizar.
const AVISO_ATUALIZACAO = 'Não foi possível atualizar agora.';

// O bloco "guardado" do resumo, no jeito mais neutro: nada guardado, sem
// plano e sem desconto no "posso gastar". É o padrão de todos os testes, para
// os testes antigos (de antes do módulo 5) continuarem vendo a mesma tela.
const GUARDADO_SEM_PLANO: Guardado = {
  total: '0.00',
  este_mes: '0.00',
  plano: null,
  previsto: null,
  progresso: null,
  falta_guardar_no_mes: '0.00',
};

// O bloco "guardado" com um plano: 1.300,00 guardados (500,00 neste mês),
// plano de 500,00 por mês até julho de 2027, previsão de 5.800,00 e 22% do
// caminho andado. Usado no caso 10.
const GUARDADO_COM_PLANO: Guardado = {
  total: '1300.00',
  este_mes: '500.00',
  plano: { valor_mensal: '500.00', mes_alvo: '2027-07' },
  previsto: '5800.00',
  progresso: 22,
  falta_guardar_no_mes: '0.00',
};

// Respostas do GET e do PATCH de /api/plano/. Sem plano, os dois campos vêm
// null; depois de salvar, o backend devolve o plano gravado.
const PLANO_VAZIO: PlanoDeGuardar = { valor_mensal: null, mes_alvo: null };
const PLANO_SALVO: PlanoDeGuardar = { valor_mensal: '500.00', mes_alvo: '2027-07' };

// Dados falsos no mesmo formato do GET /api/resumo/ (ResumoSerializer do
// backend). Os valores vêm como texto, como o backend manda.
//
// Desde o módulo 8b, cada gasto tem "categoria" (o texto para mostrar, em
// português quando há tradução) e "categoria_original" (o nome em inglês da
// Pluggy, usado para escolher o ícone). Aqui os dois ficam em inglês (o caso
// "sem tradução conhecida"), para os testes antigos verem os mesmos textos;
// a tradução aparece no teste do caso 1 do 8b.
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
      categoria_original: 'Groceries',
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
      categoria_original: 'Transportation',
      parcela_atual: null,
      total_parcelas: null,
    },
  ],
  guardado: GUARDADO_SEM_PLANO,
  // Quando o backend sincronizou com a Pluggy pela última vez. null = nunca;
  // é o padrão, para os testes antigos (de antes do módulo 3b-2) verem a
  // mesma tela, só com a linha nova "Ainda não atualizado".
  ultima_atualizacao: null,
  // Módulo 12b: sem dívidas por padrão ("0.00"), para os testes antigos
  // verem a mesma tela.
  dividas_do_mes: '0.00',
  dividas_atrasadas: '0.00',
  // Módulo 14b: sem gastos fixos ("0.00") e sem o bloco "previsto", então o
  // cartão "Gasto previsto" não aparece e os testes antigos veem a mesma tela.
  fixos_do_mes: '0.00',
};

// O bloco "previsto" do resumo (módulo 14a), com os números do exemplo do
// plano: neste mês (outubro) faltam 693,58 só de gastos fixos; no mês que vem
// (novembro) são 1.680,29, com uma fatura do Nubank, os fixos e uma dívida.
const PREVISTO_DE_EXEMPLO: Previsto = {
  mes_atual: {
    mes: '2026-10',
    total: '693.58',
    faturas: [],
    fixos: '693.58',
    dividas: '0.00',
    atrasadas: '0.00',
  },
  proximo_mes: {
    mes: '2026-11',
    total: '1680.29',
    faturas: [{ conta: 3, nome_banco: 'Nubank', nome_conta: 'gold', valor: '358.32' }],
    fixos: '731.48',
    dividas: '300.00',
  },
};

// Monta um resumo a partir do exemplo, trocando só o que o teste precisa.
// Ex.: criarResumo({ ultimos_gastos: [] }) é o exemplo sem gastos.
function criarResumo(mudancas: Partial<Resumo> = {}): Resumo {
  return { ...RESUMO_DE_EXEMPLO, ...mudancas };
}

// O resumo que o backend devolve depois de sincronizar com a Pluggy: o saldo
// mudou (de 1.250,50 para 2.000,00) e a hora da atualização foi preenchida.
// Usado nos testes de "puxar para baixo".
const RESUMO_ATUALIZADO = criarResumo({
  saldo_total: '2000.00',
  ultima_atualizacao: '2026-10-17T14:32:05.123456-03:00',
});

// Um instante falso para o relógio do celular: 17/10/2026 ao meio-dia.
// new Date(ano, mês, dia, hora, minuto) monta a data no fuso do computador
// que roda o teste (atenção: o mês começa em 0, então 9 é outubro). Meio-dia
// é longe da meia-noite, então em qualquer fuso o "dia de hoje" do celular é
// 17/10, e o teste não muda de resultado conforme o computador.
const MEIO_DIA_DE_17_DE_OUTUBRO = new Date(2026, 9, 17, 12, 0, 0);

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
// Nos testes das folhas, a tela faz pedidos diferentes: GET do resumo, GET e
// PATCH das configurações, na folha do plano GET e PATCH do plano
// (/api/plano/) e, ao puxar para baixo, POST /api/sincronizar/. O
// mockResolvedValue devolveria a mesma resposta para todos. Com
// mockImplementation passamos
// uma função nossa, que o dublê roda a cada chamada com os mesmos argumentos
// do fetch (endereço e opções). Olhando o endereço e o método
// (opcoes?.method; sem método, o fetch faz GET) escolhemos a resposta, como
// um backend de mentira. O "?." é para quando opções não vierem.
//
// As opções mudam só o que o teste precisa (o "?" diz que cada uma é
// opcional; o "= {}" deixa chamar sem nada: ligarServidorFalso()):
// - patch: a resposta do PATCH das configurações; por padrão "deu certo"
//   (200). O teste do erro 400 passa outra.
// - sincronizacao: a resposta do POST /api/sincronizar/ (o "puxar para
//   baixo", módulo 3b-2); por padrão "deu certo" (200). O teste da falha da
//   Pluggy passa um 502.
// O resumo vem de respostaDoResumo (logo abaixo). O plano sempre começa vazio
// e o PATCH dele sempre dá certo.
// ---------------------------------------------------------------------------
type OpcoesDoServidor = {
  patch?: Response;
  sincronizacao?: Response;
};

// O que o servidor falso responde no GET /api/resumo/. Começa, em cada teste,
// com o resumo de exemplo (veja o beforeEach). Um teste pode trocar por outro
// resumo, para fingir que os dados mudaram no backend, ou por uma resposta
// que demora a chegar.
let respostaDoResumo: () => Promise<Response>;

function ligarServidorFalso({
  patch = respostaFalsa(200, CONFIGURACOES_DE_EXEMPLO),
  sincronizacao = respostaFalsa(200, {
    ultima_atualizacao: '2026-10-17T14:32:05.123456-03:00',
  }),
}: OpcoesDoServidor = {}) {
  fetchFalso.mockImplementation(async (endereco, opcoes) => {
    const url = String(endereco);
    if (url.includes('/api/resumo/')) {
      return respostaDoResumo();
    }
    if (url.includes('/api/sincronizar/') && opcoes?.method === 'POST') {
      return sincronizacao;
    }
    if (url.includes('/api/configuracoes/') && opcoes?.method === 'PATCH') {
      return patch;
    }
    if (url.includes('/api/configuracoes/')) {
      return respostaFalsa(200, CONFIGURACOES_DE_EXEMPLO);
    }
    if (url.includes('/api/plano/') && opcoes?.method === 'PATCH') {
      return respostaFalsa(200, PLANO_SALVO);
    }
    if (url.includes('/api/plano/')) {
      return respostaFalsa(200, PLANO_VAZIO);
    }
    // Um pedido que não esperávamos (endereço ou método): falha alto, para o
    // erro ficar claro. Ex.: um GET em /api/sincronizar/ cai aqui.
    throw new Error(`Pedido inesperado no teste: ${opcoes?.method ?? 'GET'} ${url}`);
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

function chamadasDaSincronizacao() {
  return fetchFalso.mock.calls.filter(([endereco]) =>
    String(endereco).includes('/api/sincronizar/'),
  );
}

// ---------------------------------------------------------------------------
// Como o teste "puxa a tela para baixo"
//
// No celular, puxar a lista para baixo faz o RefreshControl (a bolinha que
// gira no topo) chamar a função onRefresh que a tela passou para ele. No Jest
// não existe dedo nem gesto, e a Testing Library não tem um atalho para esse
// gesto. Então fazemos o que o gesto faria: pegamos o ScrollView da tela,
// lemos o RefreshControl que está na propriedade refreshControl dele e
// chamamos o onRefresh.
//
// Aqui usamos testID ("rolagem-inicio", combinado no contrato) porque a área
// de rolagem não tem texto, papel nem rótulo para procurar.
//
// O "as ReactElement<RefreshControlProps>" diz ao TypeScript que a
// propriedade é um elemento RefreshControl, para ele conhecer o onRefresh.
// O act roda a chamada e espera o React terminar de atualizar a tela; na
// Testing Library 14 ele sempre devolve uma Promise, por isso o await. O
// fireEvent e o render já fazem isso sozinhos; aqui chamamos uma função da
// tela direto, então o act fica por nossa conta.
//
// Três testes puxam a tela, por isso a função. Ela só dispara a atualização;
// cada teste espera o resultado do seu jeito (findByText, waitFor).
// ---------------------------------------------------------------------------
async function puxarParaBaixo() {
  const rolagem = screen.getByTestId('rolagem-inicio');
  const controle = rolagem.props.refreshControl as ReactElement<RefreshControlProps>;
  await act(() => {
    controle.props.onRefresh?.();
  });
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

  // O servidor falso começa devolvendo o resumo de exemplo.
  respostaDoResumo = async () => respostaFalsa(200, criarResumo());
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

    // Primeiro gasto (Groceries tem o ícone do carrinho, shopping-cart).
    // Um ícone não tem texto para procurar, então aqui usamos o testID do
    // círculo ("icone-categoria-" + nome do ícone), combinado no contrato.
    // O círculo fica escondido do leitor de tela (o rótulo do gasto já fala a
    // categoria), e a Testing Library ignora o que está escondido. Por isso
    // pedimos includeHiddenElements: "procure também nos escondidos".
    expect(await screen.findByText('Mercado')).toBeOnTheScreen();
    expect(
      screen.getByTestId('icone-categoria-shopping-cart', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.getByText('- R$ 45,90')).toBeOnTheScreen();
    expect(screen.getByText('08/10 · Nubank · Groceries')).toBeOnTheScreen();

    // Segundo gasto (Transportation tem o ícone do carro, car)
    expect(screen.getByText('Uber')).toBeOnTheScreen();
    expect(
      screen.getByTestId('icone-categoria-car', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
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

  it('mostra a categoria em português e escolhe o ícone pela categoria original (8b, caso 1)', async () => {
    // Prepara: um gasto com tradução. O backend manda "Mercado" para mostrar
    // e "Groceries" como original. A descrição (Pão de Açúcar) é diferente de
    // "Mercado" de propósito, para não confundir com o primeiro gasto do
    // exemplo, que se chama "Mercado".
    const PAO_DE_ACUCAR: GastoResumo = {
      id: 813,
      data: '2026-10-10',
      descricao: 'Pão de Açúcar',
      valor: '-87.35',
      conta: 1,
      nome_conta: 'Conta corrente',
      nome_banco: 'Nubank',
      categoria: 'Mercado',
      categoria_original: 'Groceries',
      parcela_atual: null,
      total_parcelas: null,
    };
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ ultimos_gastos: [PAO_DE_ACUCAR] })),
    );

    await render(<InicioScreen />);

    // Verifica: a linha de detalhes mostra a categoria em português.
    expect(await screen.findByText('10/10 · Nubank · Mercado')).toBeOnTheScreen();

    // Verifica: o círculo é o do carrinho (shopping-cart), que vem de
    // "Groceries". Se a tela escolhesse o ícone pelo texto "Mercado", que não
    // está no mapa de categorias, o círculo seria o dos três pontinhos
    // (ellipsis). Usamos o testID do círculo, como no teste acima.
    expect(
      screen.getByTestId('icone-categoria-shopping-cart', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('icone-categoria-ellipsis', { includeHiddenElements: true }),
    ).toBeNull();
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

  it('os cartões Entrou e Fatura aberta são botões', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    // findByRole acha o elemento com papel de botão e com esse nome. Se o
    // cartão não fosse um botão, não seria achado: é o que garante que o
    // TalkBack anuncia "botão" e que dá para tocar nele.
    expect(await screen.findByRole('button', { name: BOTAO_ENTROU })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: BOTAO_FATURA })).toBeOnTheScreen();
  });

  it('o cartão Entrou tem a dica "Toque para mudar o início do mês"', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    const entrou = await screen.findByRole('button', { name: BOTAO_ENTROU });

    // A dica (accessibilityHint) é a frase que o leitor de tela fala depois
    // do nome, explicando o que o toque faz. A Testing Library não tem um
    // comparador próprio para a dica, então usamos o toHaveProp, que confere
    // uma propriedade do elemento (a documentação o indica quando nenhum
    // outro comparador serve).
    expect(entrou).toHaveProp('accessibilityHint', 'Toque para mudar o início do mês');
  });

  it('o cartão Fatura aberta tem a dica "Toque para mudar o limite da fatura"', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    const fatura = await screen.findByRole('button', { name: BOTAO_FATURA });

    expect(fatura).toHaveProp('accessibilityHint', 'Toque para mudar o limite da fatura');
  });

  it('o cartão Saldo tem nome para o leitor de tela, mas não é mais um botão', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    await screen.findByText('R$ 1.250,50');

    // O cartão existe e o leitor de tela fala o saldo em reais...
    expect(screen.getByLabelText(ROTULO_SALDO)).toBeOnTheScreen();
    // ...mas não há botão com esse nome: queryByRole devolve null quando não
    // acha. Assim ninguém toca no Saldo esperando abrir alguma coisa.
    expect(screen.queryByRole('button', { name: ROTULO_SALDO })).toBeNull();
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
  it('tocar em Entrou abre a folha com o valor atual do servidor', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);

    // Faz: toca no cartão Entrou (antes era o Saldo; desde o módulo 4c é o
    // Entrou que abre esta folha).
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_ENTROU }));

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
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_ENTROU }));
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
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_ENTROU }));
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
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_ENTROU }));
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
    ligarServidorFalso({
      patch: respostaFalsa(400, { limite_fatura: ['O limite da fatura não pode ser negativo.'] }),
    });
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

// ---------------------------------------------------------------------------
// Módulo 5b: a seção "Guardado" (casos 10 a 14 do plano)
// ---------------------------------------------------------------------------
describe('Seção "Guardado"', () => {
  it('com plano, mostra o total, o que entrou no mês, a barra e a previsão (caso 10)', async () => {
    // Prepara: o resumo com o bloco "guardado" de um plano em andamento.
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ guardado: GUARDADO_COM_PLANO })),
    );

    await render(<InicioScreen />);

    // Verifica: o total guardado e quanto entrou neste mês.
    expect(await screen.findByText('R$ 1.300,00')).toBeOnTheScreen();
    expect(screen.getByText('+ R$ 500,00 este mês')).toBeOnTheScreen();

    // A barra de progresso. Ela não tem texto, então procuramos pelo papel
    // "progressbar", o mesmo que faz o leitor de tela anunciar "barra de
    // progresso". O toHaveAccessibilityValue confere os números que o leitor
    // de tela fala: de 0 a 100, agora em 22 (o progresso que veio do backend).
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({
      min: 0,
      max: 100,
      now: 22,
    });

    // A frase da previsão, com o mês do plano por extenso e em minúsculas.
    expect(
      screen.getByText('R$ 1.300,00 de R$ 5.800,00 previstos em julho de 2027'),
    ).toBeOnTheScreen();
  });

  it('sem plano, convida a criar um e não mostra a barra (caso 11)', async () => {
    // Prepara: o resumo padrão, que já vem sem plano (GUARDADO_SEM_PLANO).
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    // Verifica: o convite aparece...
    expect(await screen.findByText('Toque para criar um plano de guardar')).toBeOnTheScreen();
    // ...e não há barra nem frase de previsão (queryBy devolve null quando
    // não acha; o /.../ pega qualquer texto que contenha o trecho).
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText(/previstos em/)).toBeNull();
  });
});

describe('Folha "Plano de guardar"', () => {
  it('tocar na seção abre a folha, e salvar "500" e "07/2027" manda o plano e recarrega o resumo (caso 12)', async () => {
    // Prepara: o servidor falso, que agora também responde /api/plano/ (o
    // GET devolve "sem plano"; o PATCH devolve o plano salvo).
    ligarServidorFalso();
    await render(<InicioScreen />);

    // Faz: toca na seção "Guardado", achada pelo papel de botão e pelo nome
    // que o leitor de tela fala.
    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_GUARDADO }));

    // Verifica: a folha abriu. O título é um cabeçalho (papel "header"), e
    // o name confere que é este cabeçalho, e não o título do mês.
    expect(await screen.findByRole('header', { name: 'Plano de guardar' })).toBeOnTheScreen();

    // Faz: os campos só aparecem depois que o GET /api/plano/ responde
    // (como na folha das configurações), por isso o findBy espera o primeiro.
    // Depois digita nos dois campos e toca em Salvar.
    await fireEvent.changeText(await screen.findByLabelText('Quanto por mês'), '500');
    await fireEvent.changeText(screen.getByLabelText('Até quando (MM/AAAA)'), '07/2027');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    // Verifica: houve exatamente um PATCH (o chamadasPatch já separa as
    // chamadas pelo método)...
    await waitFor(() => expect(chamadasPatch()).toHaveLength(1));
    // ...no endereço do plano, com o método PATCH e o corpo em JSON...
    const [endereco, opcoes] = chamadasPatch()[0];
    expect(endereco).toBe(ENDERECO_PLANO);
    expect(opcoes).toMatchObject({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    // ...com os dois campos já no formato do backend: o valor com ponto nos
    // centavos e o mês como "AAAA-MM"...
    expect(corpoDoPatch()).toEqual({ valor_mensal: '500.00', mes_alvo: '2027-07' });
    // ...e o resumo foi pedido de novo (ao abrir a tela e depois de salvar),
    // porque o plano muda a barra e o "posso gastar".
    await waitFor(() => expect(chamadasDoResumo()).toHaveLength(2));
  });

  it('mês em formato errado ("7/27") mostra o aviso e não chama o servidor (caso 13)', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: BOTAO_GUARDADO }));

    // Faz: um valor válido e um mês no formato errado. O valor é válido de
    // propósito, para o único erro possível ser o do mês.
    await fireEvent.changeText(await screen.findByLabelText('Quanto por mês'), '500');
    await fireEvent.changeText(screen.getByLabelText('Até quando (MM/AAAA)'), '7/27');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    // Verifica: o aviso aparece embaixo dos campos...
    expect(await screen.findByText('Digite o mês como MM/AAAA.')).toBeOnTheScreen();
    // ...e nenhum PATCH foi feito: o app recusou sozinho, sem incomodar o
    // servidor.
    expect(chamadasPatch()).toHaveLength(0);
  });
});

describe('Desconto do plano no "posso gastar"', () => {
  it('com algo a guardar no mês, mostra "já separando" com o valor (caso 14)', async () => {
    // Prepara: o resumo padrão, trocando só quanto falta guardar no mês.
    // O "..." copia o bloco sem plano e o campo escrito depois substitui o
    // de mesmo nome.
    fetchFalso.mockResolvedValue(
      respostaFalsa(
        200,
        criarResumo({
          guardado: { ...GUARDADO_SEM_PLANO, falta_guardar_no_mes: '200.00' },
        }),
      ),
    );

    await render(<InicioScreen />);

    expect(await screen.findByText('já separando R$ 200,00 para guardar')).toBeOnTheScreen();
  });

  it('sem nada a guardar no mês ("0.00"), não mostra "já separando" (caso 14)', async () => {
    // O resumo padrão já tem falta_guardar_no_mes "0.00".
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    // Espera a tela carregar antes de conferir a ausência (mesmo cuidado do
    // teste do aviso da fatura).
    await screen.findByText('R$ 1.250,50');

    expect(screen.queryByText(/já separando/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Módulo 3b-2: a linha "Atualizado ..." e o "puxar para baixo" (casos 3 a 7)
// ---------------------------------------------------------------------------
describe('Linha "Atualizado ..."', () => {
  it('com a última atualização de hoje às 14:32, mostra "Atualizado hoje às 14:32" (caso 3)', async () => {
    // Relógio falso: além de controlar os timers (como no teste do
    // "carregando"), ele também finge a data e a hora do celular. O "now"
    // diz que agora é 17/10/2026 ao meio-dia. Sem isso, o teste só passaria
    // no dia 17/10 de verdade: em qualquer outro dia, a tela diria "em
    // 17/10" em vez de "hoje".
    jest.useFakeTimers({ now: MEIO_DIA_DE_17_DE_OUTUBRO });

    // Prepara: o backend diz que sincronizou hoje às 14:32. A hora já vem no
    // fuso do backend; o app só recorta o texto, sem converter.
    fetchFalso.mockResolvedValue(
      respostaFalsa(
        200,
        criarResumo({ ultima_atualizacao: '2026-10-17T14:32:05.123456-03:00' }),
      ),
    );

    await render(<InicioScreen />);

    // Verifica: a linha logo abaixo do título diz "hoje" e a hora, sem os
    // segundos.
    expect(await screen.findByText('Atualizado hoje às 14:32')).toBeOnTheScreen();
  });

  it('sem nenhuma atualização (null), mostra "Ainda não atualizado" (caso 5)', async () => {
    // Prepara: o resumo de exemplo, que já vem com ultima_atualizacao null
    // (o backend nunca sincronizou com a Pluggy). Aqui não precisamos do
    // relógio falso: o texto não depende do dia de hoje.
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);

    expect(await screen.findByText('Ainda não atualizado')).toBeOnTheScreen();
  });
});

describe('Puxar para baixo', () => {
  it('sincroniza (POST), busca o resumo de novo e mostra os valores novos (caso 6)', async () => {
    // Prepara: o servidor falso responde o resumo e o POST /api/sincronizar/.
    ligarServidorFalso();
    await render(<InicioScreen />);
    await screen.findByText('R$ 1.250,50');

    // A partir de agora, o backend devolve o resumo atualizado (como se a
    // sincronização tivesse trazido dados novos da Pluggy).
    respostaDoResumo = async () => respostaFalsa(200, RESUMO_ATUALIZADO);

    // Faz: puxa a tela para baixo.
    await puxarParaBaixo();

    // Verifica: o saldo novo aparece e o antigo sumiu.
    expect(await screen.findByText('R$ 2.000,00')).toBeOnTheScreen();
    expect(screen.queryByText('R$ 1.250,50')).toBeNull();

    // A ordem dos pedidos: o resumo ao abrir a tela, depois a sincronização
    // e, só então, o resumo de novo. map pega só o endereço de cada chamada
    // anotada, e o toEqual compara a lista inteira, na ordem.
    const enderecos = fetchFalso.mock.calls.map(([endereco]) => String(endereco));
    expect(enderecos).toEqual([ENDERECO_RESUMO, ENDERECO_SINCRONIZAR, ENDERECO_RESUMO]);

    // A sincronização foi um POST, com o token no cabeçalho (sem token, o
    // backend responderia 401).
    const [, opcoes] = chamadasDaSincronizacao()[0];
    expect(opcoes).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Token token-falso' },
    });
  });

  it('enquanto atualiza, mantém os valores de antes e não mostra "Carregando o resumo..." (caso 6)', async () => {
    ligarServidorFalso();
    await render(<InicioScreen />);
    await screen.findByText('R$ 1.250,50');

    // Prepara: o próximo GET do resumo fica "no caminho" até nós deixarmos
    // ele chegar. É uma Promise que só termina quando chamarmos
    // liberarResumo(). Assim conseguimos olhar a tela NO MEIO da atualização.
    let liberarResumo: () => void = () => {};
    respostaDoResumo = () =>
      new Promise<Response>((resolver) => {
        liberarResumo = () => resolver(respostaFalsa(200, RESUMO_ATUALIZADO));
      });

    // Faz: puxa a tela para baixo e espera o app chegar ao segundo GET (o
    // POST já respondeu; agora ele espera o resumo novo).
    await puxarParaBaixo();
    await waitFor(() => expect(chamadasDoResumo()).toHaveLength(2));

    // Verifica: no meio da atualização, a tela de carregamento não tomou o
    // lugar do resumo, e o saldo de antes continua visível.
    expect(screen.queryByText('Carregando o resumo...')).toBeNull();
    expect(screen.getByText('R$ 1.250,50')).toBeOnTheScreen();

    // Faz: deixa o resumo novo chegar (dentro do act, porque a tela muda).
    await act(() => {
      liberarResumo();
    });

    // Verifica: agora o saldo novo aparece.
    expect(await screen.findByText('R$ 2.000,00')).toBeOnTheScreen();
  });

  it('se a sincronização falha (502), mantém os valores de antes e avisa "Não foi possível atualizar agora." (caso 7)', async () => {
    // Prepara: o POST /api/sincronizar/ responde 502, que é o que o backend
    // devolve quando a Pluggy falha.
    ligarServidorFalso({
      sincronizacao: respostaFalsa(502, { detail: 'A Pluggy não respondeu.' }),
    });
    await render(<InicioScreen />);
    await screen.findByText('R$ 1.250,50');

    // Faz: puxa a tela para baixo.
    await puxarParaBaixo();

    // Verifica: o aviso aparece...
    expect(await screen.findByText(AVISO_ATUALIZACAO)).toBeOnTheScreen();
    // ...o resumo de antes continua na tela, em vez da tela de erro (o 502
    // vira erro de "servidor", mas aqui não pode trocar a tela inteira)...
    expect(screen.getByText('R$ 1.250,50')).toBeOnTheScreen();
    expect(screen.queryByText(MENSAGEM_SERVIDOR)).toBeNull();
    // ...e o resumo foi pedido só uma vez (ao abrir a tela): se a
    // sincronização falhou, não há dados novos para buscar.
    expect(chamadasDoResumo()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Módulo 12b: dívidas no Início (caso 12 da seção "12b: contrato do app" em
// docs/planos/modulo-12-dividas.md)
// ---------------------------------------------------------------------------
describe('Dívidas no Início', () => {
  it('com parcelas no mês, o cartão Saiu mostra "inclui R$ 333,33 de dívidas" e o rótulo completo (caso 12)', async () => {
    // Prepara: saídas de 1.200,00, das quais 333,33 são parcelas de dívidas.
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ saidas: '1200.00', dividas_do_mes: '333.33' })),
    );

    await render(<InicioScreen />);

    expect(await screen.findByText('inclui R$ 333,33 de dívidas')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Saiu no mês: 1.200,00 reais, inclui 333,33 reais de dívidas'),
    ).toBeOnTheScreen();
  });

  it('com parcelas atrasadas, mostra a faixa "Há R$ 333,33 em parcelas de dívidas atrasadas." (caso 12)', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo({ dividas_atrasadas: '333.33' })));

    await render(<InicioScreen />);

    expect(
      await screen.findByText('Há R$ 333,33 em parcelas de dívidas atrasadas.'),
    ).toBeOnTheScreen();
  });

  it('com dívidas "0.00", não mostra a linha nem a faixa (caso 12)', async () => {
    // O resumo padrão já tem os dois campos em "0.00".
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    // Espera a tela carregar antes de conferir a ausência.
    await screen.findByText('R$ 1.250,50');

    expect(screen.queryByText(/de dívidas/)).toBeNull();
    expect(screen.queryByText(/parcelas de dívidas atrasadas/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Módulo 14b: o cartão "Gasto previsto" e os gastos fixos no "Saiu" (casos 1 a
// 6 da seção "14b: contrato do app" em
// docs/planos/modulo-14-gasto-previsto-e-fixos.md). O caso 15 (reler o resumo
// quando a aba ganha foco) está em rotas-test.tsx, porque precisa das abas.
// ---------------------------------------------------------------------------
describe('Cartão "Gasto previsto"', () => {
  it('mostra o cartão com "Falta pagar em outubro" (R$ 693,58) e "Previsto para novembro" (R$ 1.680,29) (caso 1)', async () => {
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ previsto: PREVISTO_DE_EXEMPLO })),
    );

    await render(<InicioScreen />);

    // O título do cartão é um cabeçalho (papel "header").
    expect(await screen.findByRole('header', { name: 'Gasto previsto' })).toBeOnTheScreen();
    expect(screen.getByText('Falta pagar em outubro')).toBeOnTheScreen();
    expect(screen.getByText('R$ 693,58')).toBeOnTheScreen();
    expect(screen.getByText('Previsto para novembro')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.680,29')).toBeOnTheScreen();
  });

  it('o detalhe mostra só o que não é zero, na ordem fatura, fixos, dívidas (caso 2)', async () => {
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ previsto: PREVISTO_DE_EXEMPLO })),
    );

    await render(<InicioScreen />);
    await screen.findByText('Falta pagar em outubro');

    // No mês atual só há fixos; o resto é "0.00" e não aparece. O texto exato
    // do que falta aparece e o dos zerados não.
    expect(screen.getByText('Gastos fixos: R$ 693,58')).toBeOnTheScreen();
    expect(screen.queryByText('Dívidas: R$ 0,00')).toBeNull();
    expect(screen.queryByText(/Parcelas atrasadas/)).toBeNull();
    // No mês que vem, as três linhas aparecem.
    expect(screen.getByText('Fatura Nubank: R$ 358,32')).toBeOnTheScreen();
    expect(screen.getByText('Gastos fixos: R$ 731,48')).toBeOnTheScreen();
    expect(screen.getByText('Dívidas: R$ 300,00')).toBeOnTheScreen();
    // A ordem na tela, de cima para baixo (o mês atual vem primeiro).
    // (O "Fatura [^:]+:" evita pegar o cartão "Fatura aberta".)
    const linhas = screen.getAllByText(
      /^(Fatura [^:]+: |Gastos fixos: |Dívidas: |Parcelas atrasadas: )R\$/,
    );
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toHaveTextContent('Gastos fixos: R$ 693,58');
    expect(linhas[1]).toHaveTextContent('Fatura Nubank: R$ 358,32');
    expect(linhas[2]).toHaveTextContent('Gastos fixos: R$ 731,48');
    expect(linhas[3]).toHaveTextContent('Dívidas: R$ 300,00');
  });

  it('com parcelas atrasadas, o mês atual mostra "Parcelas atrasadas: R$ 120,00" (caso 3)', async () => {
    const comAtraso: Previsto = {
      ...PREVISTO_DE_EXEMPLO,
      mes_atual: { ...PREVISTO_DE_EXEMPLO.mes_atual, total: '813.58', atrasadas: '120.00' },
    };
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo({ previsto: comAtraso })));

    await render(<InicioScreen />);

    expect(await screen.findByText('Parcelas atrasadas: R$ 120,00')).toBeOnTheScreen();
  });

  it('com os dois meses zerados, mostra "Nada pendente." e "Nada previsto." (caso 4)', async () => {
    const zerado: Previsto = {
      mes_atual: {
        mes: '2026-10',
        total: '0.00',
        faturas: [],
        fixos: '0.00',
        dividas: '0.00',
        atrasadas: '0.00',
      },
      proximo_mes: {
        mes: '2026-11',
        total: '0.00',
        faturas: [],
        fixos: '0.00',
        dividas: '0.00',
      },
    };
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo({ previsto: zerado })));

    await render(<InicioScreen />);

    expect(await screen.findByText('Nada pendente.')).toBeOnTheScreen();
    expect(screen.getByText('Nada previsto.')).toBeOnTheScreen();
    // Os dois blocos mostram "R$ 0,00" (conferido pelo rótulo de cada bloco,
    // porque outros cartões da tela também podem mostrar "R$ 0,00").
    expect(
      screen.getByLabelText('Falta pagar em outubro: 0,00 reais. Nada pendente.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Previsto para novembro: 0,00 reais. Nada previsto.'),
    ).toBeOnTheScreen();
  });

  it('cada bloco tem o nome completo para o leitor de tela (caso 5)', async () => {
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ previsto: PREVISTO_DE_EXEMPLO })),
    );

    await render(<InicioScreen />);
    await screen.findByText('Falta pagar em outubro');

    expect(
      screen.getByLabelText('Falta pagar em outubro: 693,58 reais. Gastos fixos: 693,58 reais.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Previsto para novembro: 1.680,29 reais. Fatura Nubank: 358,32 reais. Gastos fixos: 731,48 reais. Dívidas: 300,00 reais.',
      ),
    ).toBeOnTheScreen();
  });

  it('o bloco zerado do mês atual fala "Nada pendente." no nome do leitor de tela (caso 5)', async () => {
    const zerado: Previsto = {
      mes_atual: {
        mes: '2026-10',
        total: '0.00',
        faturas: [],
        fixos: '0.00',
        dividas: '0.00',
        atrasadas: '0.00',
      },
      proximo_mes: PREVISTO_DE_EXEMPLO.proximo_mes,
    };
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo({ previsto: zerado })));

    await render(<InicioScreen />);

    expect(
      await screen.findByLabelText('Falta pagar em outubro: 0,00 reais. Nada pendente.'),
    ).toBeOnTheScreen();
  });

  it('sem o bloco "previsto" no resumo, o cartão não aparece (caso 6)', async () => {
    // O resumo padrão não tem "previsto".
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    await screen.findByText('R$ 1.250,50');

    expect(screen.queryByText('Gasto previsto')).toBeNull();
    expect(screen.queryByText(/Falta pagar em/)).toBeNull();
  });
});

describe('Gastos fixos no Início', () => {
  it('com fixos a pagar, o cartão Saiu mostra "inclui R$ 693,58 de gastos fixos" e o rótulo completo (caso 6)', async () => {
    fetchFalso.mockResolvedValue(
      respostaFalsa(200, criarResumo({ saidas: '2000.00', fixos_do_mes: '693.58' })),
    );

    await render(<InicioScreen />);

    expect(await screen.findByText('inclui R$ 693,58 de gastos fixos')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Saiu no mês: 2.000,00 reais, inclui 693,58 reais de gastos fixos'),
    ).toBeOnTheScreen();
  });

  it('com fixos "0.00", não mostra a linha de gastos fixos no Saiu (caso 6)', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));

    await render(<InicioScreen />);
    await screen.findByText('R$ 1.250,50');

    expect(screen.queryByText(/de gastos fixos/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Módulo 19b: o olho que esconde os valores (casos 1 e 2 do pedido do 19b;
// caso 5 do plano em docs/planos/modulo-19-ui-fluida.md)
//
// Com os valores escondidos, todo valor em dinheiro do Início vira "R$ ••••"
// e o leitor de tela fala "valor escondido" no lugar do número.
// ---------------------------------------------------------------------------
describe('Olho do Início (19b)', () => {
  it('tocar em "Esconder valores" troca o botão para "Mostrar valores" e esconde os valores (caso 1)', async () => {
    // Prepara: o resumo de exemplo (saldo 1.250,50 e fatura 499,90).
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));
    await render(<InicioScreen />);

    // Faz: acha o botão do olho pelo nome que o leitor de tela fala e toca nele.
    await fireEvent.press(await screen.findByRole('button', { name: 'Esconder valores' }));

    // Verifica: o botão agora diz o que o próximo toque fará...
    expect(screen.getByRole('button', { name: 'Mostrar valores' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Esconder valores' })).toBeNull();
    // ...os valores viraram "R$ ••••" (getAllByText porque são vários)...
    expect(screen.getAllByText('R$ ••••').length).toBeGreaterThan(0);
    expect(screen.getByText('+ R$ ••••')).toBeOnTheScreen();
    expect(screen.getByText('- R$ ••••')).toBeOnTheScreen();
    // ...os valores conhecidos do resumo sumiram da tela...
    expect(screen.queryByText('R$ 1.250,50')).toBeNull();
    expect(screen.queryByText('R$ 499,90')).toBeNull();
    // ...e o leitor de tela também não fala mais o saldo.
    expect(screen.getByLabelText('Saldo: valor escondido')).toBeOnTheScreen();
    expect(screen.queryByLabelText(ROTULO_SALDO)).toBeNull();
  });

  it('tocar de novo em "Mostrar valores" volta os valores de antes (caso 1)', async () => {
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));
    await render(<InicioScreen />);

    // Faz: esconde e depois mostra de novo.
    await fireEvent.press(await screen.findByRole('button', { name: 'Esconder valores' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar valores' }));

    // Verifica: o saldo e a fatura voltaram, nenhum "R$ ••••" sobrou e o
    // botão voltou a se chamar "Esconder valores".
    expect(screen.getByText('R$ 1.250,50')).toBeOnTheScreen();
    expect(screen.getByText('R$ 499,90')).toBeOnTheScreen();
    expect(screen.queryAllByText(/••••/)).toHaveLength(0);
    expect(screen.getByLabelText(ROTULO_SALDO)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Esconder valores' })).toBeOnTheScreen();
  });

  it('com os valores escondidos, o "posso gastar por dia" também fica escondido (caso 2)', async () => {
    // O resumo de exemplo tem posso_gastar_por_dia "31.31".
    fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));
    await render(<InicioScreen />);
    // Antes do toque, o número grande está na tela.
    expect(await screen.findByText('R$ 31,31')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Esconder valores' }));

    // Verifica: o número sumiu, e o bloco do destaque fala "valor escondido".
    expect(screen.queryByText('R$ 31,31')).toBeNull();
    expect(screen.getByLabelText('Posso gastar por dia: valor escondido')).toBeOnTheScreen();
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
