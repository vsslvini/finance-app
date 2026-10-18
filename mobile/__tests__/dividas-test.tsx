// Testes da aba "A pagar" (arquivo e endereço /dividas mantidos). Duas partes:
// - módulo 12b: a lista de dívidas, a folha "Nova dívida" e a folha da dívida
//   (parcelas e apagar); casos da seção "12b: contrato do app" em
//   docs/planos/modulo-12-dividas.md;
// - módulo 14b: os gastos fixos (lista, marcar pago, folha do gasto fixo);
//   casos 7 a 14 da seção "14b: contrato do app" em
//   docs/planos/modulo-14-gasto-previsto-e-fixos.md.
//
// A tela fala com estas rotas do backend, todas simuladas (mock, veja
// testes/ajudantes.ts):
// - GET /api/dividas/: a lista;
// - POST /api/dividas/: cadastra uma dívida (e o backend gera as parcelas);
// - PATCH /api/parcelas/<id>/: marca ou desmarca uma parcela como paga;
// - DELETE /api/dividas/<id>/: apaga a dívida;
// - GET /api/gastos-fixos/ e POST /api/gastos-fixos/: lista e cadastra fixos;
// - PATCH e DELETE /api/gastos-fixos/<id>/: edita e apaga um fixo;
// - PUT e DELETE /api/gastos-fixos/<id>/pagamentos/<AAAA-MM>/: marca e
//   desmarca o pagamento do mês (a resposta é o gasto fixo atualizado).
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import DividasScreen from '@/app/(abas)/dividas';

import {
  ENDERECO_BASE,
  MENSAGEM_SERVIDOR,
  enderecosPedidos,
  fetchFalso,
  prepararFetchFalso,
  respostaFalsa,
} from '../testes/ajudantes';

// Dublê do pacote de ícones (explicado em tela-inicio-test.tsx).
jest.mock('@react-native-vector-icons/lucide', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  function IconeFalso({ name, ...resto }: { name: string }) {
    return React.createElement(Text, resto, name);
  }
  return { __esModule: true, default: IconeFalso, Lucide: IconeFalso };
});

// Liga o fetch falso e o .env falso antes de cada teste (e limpa depois).
prepararFetchFalso();

// ---------------------------------------------------------------------------
// Dados falsos no formato do GET /api/dividas/ (módulo 12a). Os valores
// vêm como texto, como o backend manda; "mes" vem como "AAAA-MM".
// ---------------------------------------------------------------------------

// Monta uma parcela. "atrasada" é calculada pelo backend (não paga e de mês
// anterior ao mês atual do app); aqui só escolhemos o valor.
function parcela(numero: number, mes: string, valor: string, paga: boolean, atrasada: boolean) {
  return { id: numero, numero, mes, valor, paga, atrasada };
}

// R$ 1.000 em 3x: a primeira (outubro) já paga, as outras duas a pagar. A
// próxima parcela é a 2, de novembro, sem atraso.
const DIVIDA_TIA = {
  id: 1,
  credor: 'Tia Maria',
  motivo: 'Empréstimo do carro',
  valor_total: '1000.00',
  total_parcelas: 3,
  mes_inicio: '2026-10',
  parcelas_pagas: 1,
  valor_pago: '333.33',
  valor_restante: '666.67',
  proxima_parcela: { id: 2, numero: 2, mes: '2026-11', valor: '333.33', atrasada: false },
  parcelas: [
    parcela(1, '2026-10', '333.33', true, false),
    parcela(2, '2026-11', '333.33', false, false),
    parcela(3, '2026-12', '333.34', false, false),
  ],
};

// Monta uma dívida a partir da DIVIDA_TIA, trocando só o que o teste precisa.
function criarDivida(mudancas: Record<string, unknown> = {}) {
  return { ...DIVIDA_TIA, ...mudancas };
}

// A mesma dívida, mas a parcela 2 ficou para trás (outubro, não paga e
// atrasada). Tem uma parcela paga, uma atrasada e uma a pagar: as três
// situações da folha.
const DIVIDA_COM_ATRASO = criarDivida({
  proxima_parcela: { id: 2, numero: 2, mes: '2026-10', valor: '333.33', atrasada: true },
  parcelas: [
    parcela(1, '2026-09', '333.33', true, false),
    parcela(2, '2026-10', '333.33', false, true),
    parcela(3, '2026-11', '333.34', false, false),
  ],
});

// Os nomes que o leitor de tela fala em cada cartão (o contrato fixa o texto).
const ROTULO_TIA =
  'Dívida com Tia Maria, Empréstimo do carro. Falta 666,67 reais de 1.000,00 reais. 1 de 3 parcelas pagas. Próxima parcela: 333,33 reais em novembro de 2026.';
const ROTULO_COM_ATRASO =
  'Dívida com Tia Maria, Empréstimo do carro. Falta 666,67 reais de 1.000,00 reais. 1 de 3 parcelas pagas. Parcela atrasada: 333,33 reais de outubro de 2026.';

// O nome de cada parcela na folha da dívida.
const PARCELA_1_PAGA = 'Parcela 1 de 3, outubro de 2026, 333,33 reais';
const PARCELA_2 = 'Parcela 2 de 3, novembro de 2026, 333,33 reais';

// ---------------------------------------------------------------------------
// Dados falsos no formato do GET /api/gastos-fixos/ (módulo 14a). "valor" vem
// como texto; "dia_vencimento" é número ou null; "mes_inicio" e "este_mes.mes"
// vêm como "AAAA-MM". "este_mes.situacao" é uma de: "pago_automatico",
// "pago_manual", "a_pagar" e "nao_comecou".
// ---------------------------------------------------------------------------
function criarFixo(mudancas: Record<string, unknown> = {}) {
  return {
    id: 1,
    nome: 'Apartamento',
    valor: '1200.00',
    dia_vencimento: 10,
    mes_inicio: '2026-09',
    trecho_descricao: 'DIRECIONAL',
    este_mes: { mes: '2026-10', situacao: 'a_pagar' },
    ...mudancas,
  };
}

const FIXO_A_PAGAR = criarFixo();
const FIXO_PAGO_MANUAL = criarFixo({ este_mes: { mes: '2026-10', situacao: 'pago_manual' } });

// Os nomes que o leitor de tela fala em cada linha de gasto fixo.
const ROTULO_FIXO_A_PAGAR =
  'Apartamento, 1.200,00 reais por mês, vence dia 10. A pagar em outubro.';
const ROTULO_FIXO_PAGO_MANUAL =
  'Apartamento, 1.200,00 reais por mês, vence dia 10. Pago em outubro.';
const MARCAR_APARTAMENTO = 'Marcar Apartamento como pago em outubro';
const DESMARCAR_APARTAMENTO = 'Desmarcar o pagamento de Apartamento em outubro';

// Um instante falso para o relógio do celular: 17/10/2026 ao meio-dia (a
// explicação do new Date(ano, mês, dia, ...) está em tela-inicio-test.tsx;
// o mês começa em 0, então 9 é outubro).
const MEIO_DIA_DE_17_DE_OUTUBRO = new Date(2026, 9, 17, 12, 0, 0);

// ---------------------------------------------------------------------------
// O servidor falso desta tela
//
// Cada rota tem a sua resposta, que um teste pode trocar. Todas voltam ao
// padrão antes de cada teste (veja o beforeEach). Qualquer outro pedido dá
// erro alto, para o problema ficar claro.
// ---------------------------------------------------------------------------
let respostaDasDividas: () => Promise<Response>;
let respostaDoCadastro: () => Promise<Response>;
let respostaDaParcela: () => Promise<Response>;
let respostaDoApagar: () => Promise<Response>;
// A edição da dívida (módulo 15b): PATCH /api/dividas/<id>/.
let respostaDaEdicao: () => Promise<Response>;
// Os gastos fixos (módulo 14b). Por padrão não há nenhum, para os testes das
// dívidas verem a mesma tela de antes.
let respostaDosFixos: () => Promise<Response>;
let respostaDoCadastroFixo: () => Promise<Response>;
let respostaDaEdicaoFixo: () => Promise<Response>;
let respostaDoApagarFixo: () => Promise<Response>;
let respostaDoPagamento: () => Promise<Response>;

beforeEach(() => {
  respostaDasDividas = async () => respostaFalsa(200, [DIVIDA_TIA]);
  respostaDoCadastro = async () => respostaFalsa(201, DIVIDA_TIA);
  respostaDaParcela = async () => respostaFalsa(200, DIVIDA_TIA);
  respostaDoApagar = async () => respostaFalsa(204);
  respostaDaEdicao = async () => respostaFalsa(200, DIVIDA_TIA);
  respostaDosFixos = async () => respostaFalsa(200, []);
  respostaDoCadastroFixo = async () => respostaFalsa(201, FIXO_A_PAGAR);
  respostaDaEdicaoFixo = async () => respostaFalsa(200, FIXO_A_PAGAR);
  respostaDoApagarFixo = async () => respostaFalsa(204);
  respostaDoPagamento = async () => respostaFalsa(200, FIXO_A_PAGAR);
  fetchFalso.mockImplementation(async (endereco, opcoes) => {
    const url = String(endereco);
    // Sem método, o fetch faz GET.
    const metodo = opcoes?.method ?? 'GET';
    // Gastos fixos: a rota do pagamento (/pagamentos/) vem primeiro, porque o
    // endereço dela também contém /api/gastos-fixos/.
    if (url.includes('/api/gastos-fixos/') && url.includes('/pagamentos/')) {
      return respostaDoPagamento();
    }
    if (url.endsWith('/api/gastos-fixos/') && metodo === 'GET') {
      return respostaDosFixos();
    }
    if (url.endsWith('/api/gastos-fixos/') && metodo === 'POST') {
      return respostaDoCadastroFixo();
    }
    if (url.includes('/api/gastos-fixos/') && metodo === 'PATCH') {
      return respostaDaEdicaoFixo();
    }
    if (url.includes('/api/gastos-fixos/') && metodo === 'DELETE') {
      return respostaDoApagarFixo();
    }
    if (url.includes('/api/dividas/') && metodo === 'GET') {
      return respostaDasDividas();
    }
    if (url.includes('/api/dividas/') && metodo === 'POST') {
      return respostaDoCadastro();
    }
    if (url.includes('/api/dividas/') && metodo === 'DELETE') {
      return respostaDoApagar();
    }
    if (url.includes('/api/dividas/') && metodo === 'PATCH') {
      return respostaDaEdicao();
    }
    if (url.includes('/api/parcelas/') && metodo === 'PATCH') {
      return respostaDaParcela();
    }
    throw new Error(`Pedido inesperado no teste: ${metodo} ${url}`);
  });
});

// As chamadas já feitas com um método e um trecho de endereço.
function chamadas(metodo: string, trecho: string) {
  return fetchFalso.mock.calls.filter(
    ([endereco, opcoes]) =>
      (opcoes?.method ?? 'GET') === metodo && String(endereco).includes(trecho),
  );
}

// O corpo (JSON) da primeira chamada com esse método e trecho, de volta de
// texto para objeto, para compararmos com toEqual.
function corpoDe(metodo: string, trecho: string): unknown {
  const [, opcoes] = chamadas(metodo, trecho)[0];
  return JSON.parse(String(opcoes?.body));
}

// Abre a folha "Nova dívida": renderiza a aba, toca no botão e espera o
// título da folha (um cabeçalho; o botão também se chama "Nova dívida", por
// isso a busca é pelo papel "header").
async function abrirNovaDivida() {
  await render(<DividasScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Nova dívida' }));
  await screen.findByRole('header', { name: 'Nova dívida' });
}

// Preenche os cinco campos da folha "Nova dívida" (os rótulos são os nomes
// visíveis dos campos). Cada campo tem um valor válido por padrão; o teste
// passa só o que quer mudar. fireEvent.changeText simula a pessoa digitando.
async function preencherNovaDivida(
  campos: { credor?: string; motivo?: string; valor?: string; parcelas?: string; mes?: string } = {},
) {
  const { credor = 'Tia Maria', motivo = '', valor = '1.000,00', parcelas = '3', mes = '11/2026' } =
    campos;
  await fireEvent.changeText(screen.getByLabelText('Para quem'), credor);
  await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), motivo);
  await fireEvent.changeText(screen.getByLabelText('Valor total'), valor);
  await fireEvent.changeText(screen.getByLabelText('Parcelas'), parcelas);
  await fireEvent.changeText(screen.getByLabelText('Mês da primeira parcela (MM/AAAA)'), mes);
}

// Abre a folha da dívida: renderiza a aba, toca no cartão (achado pelo nome
// que o leitor de tela fala) e espera o botão "Apagar dívida" da folha.
async function abrirFolhaDaDivida(rotuloDoCartao: string) {
  await render(<DividasScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: rotuloDoCartao }));
  await screen.findByRole('button', { name: 'Apagar dívida' });
}

// ---------------------------------------------------------------------------
// A lista de dívidas (casos 1 a 5)
// ---------------------------------------------------------------------------
describe('Aba A pagar (dívidas)', () => {
  it('sem dívidas, avisa "Nenhuma dívida cadastrada." e oferece "Nova dívida" (caso 1)', async () => {
    respostaDasDividas = async () => respostaFalsa(200, []);

    await render(<DividasScreen />);

    expect(await screen.findByText('Nenhuma dívida cadastrada.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Nova dívida' })).toBeOnTheScreen();
  });

  it('mostra o credor, o motivo, quanto falta, as parcelas pagas e a próxima parcela (caso 2)', async () => {
    await render(<DividasScreen />);

    expect(await screen.findByText('Tia Maria')).toBeOnTheScreen();
    expect(screen.getByText('Empréstimo do carro')).toBeOnTheScreen();
    expect(screen.getByText('Falta R$ 666,67 de R$ 1.000,00')).toBeOnTheScreen();
    expect(screen.getByText('1 de 3 parcelas pagas')).toBeOnTheScreen();
    expect(screen.getByText('Próxima: R$ 333,33 em novembro de 2026')).toBeOnTheScreen();
  });

  it('a barra de progresso mostra 33% (1 de 3 parcelas, arredondado para baixo) (caso 2)', async () => {
    await render(<DividasScreen />);
    await screen.findByText('Tia Maria');

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 100, now: 33 });
  });

  it('o cartão é um botão com o nome completo para o leitor de tela e a dica (caso 2)', async () => {
    await render(<DividasScreen />);

    const cartao = await screen.findByRole('button', { name: ROTULO_TIA });

    expect(cartao).toHaveProp('accessibilityHint', 'Toque para ver as parcelas');
  });

  it('dívida sem motivo não mostra o trecho do motivo no nome do cartão (caso 3)', async () => {
    respostaDasDividas = async () => respostaFalsa(200, [criarDivida({ motivo: '' })]);

    await render(<DividasScreen />);

    expect(
      await screen.findByRole('button', {
        name: 'Dívida com Tia Maria. Falta 666,67 reais de 1.000,00 reais. 1 de 3 parcelas pagas. Próxima parcela: 333,33 reais em novembro de 2026.',
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Empréstimo do carro')).toBeNull();
  });

  it('dívida quitada mostra "Tudo pago" e nenhuma "Próxima:" (caso 3)', async () => {
    // Prepara: as 3 parcelas pagas, então não há próxima parcela (null).
    const quitada = criarDivida({
      parcelas_pagas: 3,
      valor_pago: '1000.00',
      valor_restante: '0.00',
      proxima_parcela: null,
      parcelas: [
        parcela(1, '2026-10', '333.33', true, false),
        parcela(2, '2026-11', '333.33', true, false),
        parcela(3, '2026-12', '333.34', true, false),
      ],
    });
    respostaDasDividas = async () => respostaFalsa(200, [quitada]);

    await render(<DividasScreen />);

    expect(await screen.findByText('Tudo pago')).toBeOnTheScreen();
    expect(screen.queryByText(/Próxima:/)).toBeNull();
    // O nome para o leitor de tela termina com "Tudo pago." (regex: o $ quer
    // dizer "termina aqui").
    expect(screen.getByLabelText(/Tudo pago\.$/)).toBeOnTheScreen();
  });

  it('com uma parcela atrasada, mostra a faixa no singular e "Atrasada: ..." no cartão (caso 4)', async () => {
    respostaDasDividas = async () => respostaFalsa(200, [DIVIDA_COM_ATRASO]);

    await render(<DividasScreen />);

    expect(
      await screen.findByText('1 parcela atrasada. Se já pagou, marque como paga na dívida.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Atrasada: R$ 333,33 de outubro de 2026')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ROTULO_COM_ATRASO })).toBeOnTheScreen();
    // Com atraso, a linha "Próxima:" não aparece.
    expect(screen.queryByText(/Próxima:/)).toBeNull();
  });

  it('com duas parcelas atrasadas, mostra a faixa no plural (caso 4)', async () => {
    // Prepara: uma dívida com duas parcelas atrasadas (setembro e outubro).
    const duasAtrasadas = criarDivida({
      parcelas_pagas: 0,
      valor_pago: '0.00',
      valor_restante: '1000.00',
      proxima_parcela: { id: 1, numero: 1, mes: '2026-09', valor: '333.33', atrasada: true },
      parcelas: [
        parcela(1, '2026-09', '333.33', false, true),
        parcela(2, '2026-10', '333.33', false, true),
        parcela(3, '2026-11', '333.34', false, false),
      ],
    });
    respostaDasDividas = async () => respostaFalsa(200, [duasAtrasadas]);

    await render(<DividasScreen />);

    expect(
      await screen.findByText('2 parcelas atrasadas. Se já pagou, marque como paga na dívida.'),
    ).toBeOnTheScreen();
  });

  it('sem parcelas atrasadas, a faixa não aparece (caso 4)', async () => {
    await render(<DividasScreen />);
    await screen.findByText('Tia Maria');

    expect(screen.queryByText(/atrasadas?\. Se já pagou/)).toBeNull();
    expect(screen.queryByText(/Atrasada:/)).toBeNull();
  });

  it('mostra "Carregando o que falta pagar..." enquanto espera (caso 5, texto novo no 14b)', async () => {
    // Relógio falso e fetch que nunca termina (mesmo cuidado das outras telas).
    jest.useFakeTimers();
    fetchFalso.mockReset();
    fetchFalso.mockReturnValue(new Promise<Response>(() => {}));

    await render(<DividasScreen />);

    expect(screen.getByText('Carregando o que falta pagar...')).toBeOnTheScreen();
  });

  it('com erro 500, avisa e "Tentar de novo" busca de novo e mostra as dívidas (caso 5)', async () => {
    respostaDasDividas = async () => respostaFalsa(500);

    await render(<DividasScreen />);

    expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeOnTheScreen();

    // O servidor se recupera.
    respostaDasDividas = async () => respostaFalsa(200, [DIVIDA_TIA]);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Tia Maria')).toBeOnTheScreen();
    expect(enderecosPedidos('/api/dividas/')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// A folha "Nova dívida" (casos 6 a 8)
// ---------------------------------------------------------------------------
describe('Folha "Nova dívida"', () => {
  it('sem "Para quem", avisa "Informe para quem é a dívida." e não chama a API (caso 6)', async () => {
    await abrirNovaDivida();

    await preencherNovaDivida({ credor: '' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe para quem é a dívida.')).toBeOnTheScreen();
    expect(chamadas('POST', '/api/dividas/')).toHaveLength(0);
  });

  it('valor que não é número avisa "Digite um valor, ex.: 500,00." e não chama a API (caso 6)', async () => {
    await abrirNovaDivida();

    await preencherNovaDivida({ valor: 'abc' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Digite um valor, ex.: 500,00.')).toBeOnTheScreen();
    expect(chamadas('POST', '/api/dividas/')).toHaveLength(0);
  });

  it('valor zero avisa "O valor precisa ser maior que zero." e não chama a API (caso 6)', async () => {
    await abrirNovaDivida();

    await preencherNovaDivida({ valor: '0' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('O valor precisa ser maior que zero.')).toBeOnTheScreen();
    expect(chamadas('POST', '/api/dividas/')).toHaveLength(0);
  });

  // it.each repete o mesmo teste para cada item da lista; o %s vira o valor
  // no nome do teste.
  it.each(['0', '121'])(
    'com %s parcelas avisa "As parcelas precisam ficar entre 1 e 120." e não chama a API (caso 6)',
    async (parcelas) => {
      await abrirNovaDivida();

      await preencherNovaDivida({ parcelas });
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

      expect(
        await screen.findByText('As parcelas precisam ficar entre 1 e 120.'),
      ).toBeOnTheScreen();
      expect(chamadas('POST', '/api/dividas/')).toHaveLength(0);
    },
  );

  it.each(['7/27', ''])(
    'com o mês "%s" avisa "Digite o mês como MM/AAAA." e não chama a API (caso 6)',
    async (mes) => {
      await abrirNovaDivida();

      await preencherNovaDivida({ mes });
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Digite o mês como MM/AAAA.')).toBeOnTheScreen();
      expect(chamadas('POST', '/api/dividas/')).toHaveLength(0);
    },
  );

  it('com vários erros, só o primeiro aparece (na ordem do formulário) (caso 6)', async () => {
    await abrirNovaDivida();

    // Valor inválido e parcelas fora do limite ao mesmo tempo: só o do valor.
    await preencherNovaDivida({ valor: 'abc', parcelas: '0' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Digite um valor, ex.: 500,00.')).toBeOnTheScreen();
    expect(screen.queryByText('As parcelas precisam ficar entre 1 e 120.')).toBeNull();
  });

  it('abre com "1" parcela e o mês atual do celular ("10/2026") (caso 7)', async () => {
    // Relógio falso: finge que hoje é 17/10/2026. Sem isso, o teste só
    // passaria em outubro de 2026.
    jest.useFakeTimers({ now: MEIO_DIA_DE_17_DE_OUTUBRO });

    await abrirNovaDivida();

    expect(screen.getByLabelText('Parcelas')).toHaveDisplayValue('1');
    expect(screen.getByLabelText('Mês da primeira parcela (MM/AAAA)')).toHaveDisplayValue(
      '10/2026',
    );
  });

  it('mostra a prévia "1x de R$ 500,00" (caso 7)', async () => {
    await abrirNovaDivida();

    await preencherNovaDivida({ valor: '500', parcelas: '1' });

    expect(screen.getByText('1x de R$ 500,00')).toBeOnTheScreen();
  });

  it('mostra a prévia "3x de R$ 300,00" quando a divisão é exata (caso 7)', async () => {
    await abrirNovaDivida();

    await preencherNovaDivida({ valor: '900', parcelas: '3' });

    expect(screen.getByText('3x de R$ 300,00')).toBeOnTheScreen();
  });

  it('mostra a prévia "3x de R$ 333,33 (a última de R$ 333,34)" quando sobra centavo (caso 7)', async () => {
    await abrirNovaDivida();

    await preencherNovaDivida({ valor: '1.000,00', parcelas: '3' });

    expect(screen.getByText('3x de R$ 333,33 (a última de R$ 333,34)')).toBeOnTheScreen();
  });

  it('com valor inválido, não mostra prévia (caso 7)', async () => {
    await abrirNovaDivida();

    await preencherNovaDivida({ valor: 'abc', parcelas: '3' });

    // Nenhum texto no formato "Nx de R$".
    expect(screen.queryByText(/\dx de R\$/)).toBeNull();
  });

  it('salvar manda o POST com o corpo exato, fecha a folha e busca a lista de novo (caso 8)', async () => {
    await abrirNovaDivida();

    await preencherNovaDivida({
      credor: 'Tia Maria',
      motivo: 'Empréstimo do carro',
      valor: '1.000,00',
      parcelas: '3',
      mes: '11/2026',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    // Verifica: um POST no endereço certo, com o token e o corpo no formato
    // do backend (valor com ponto, mês como "AAAA-MM", parcelas como número).
    await waitFor(() => expect(chamadas('POST', '/api/dividas/')).toHaveLength(1));
    const [endereco, opcoes] = chamadas('POST', '/api/dividas/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/dividas/`);
    expect(opcoes).toMatchObject({
      headers: { Authorization: 'Token token-falso', 'Content-Type': 'application/json' },
    });
    expect(corpoDe('POST', '/api/dividas/')).toEqual({
      credor: 'Tia Maria',
      motivo: 'Empréstimo do carro',
      valor_total: '1000.00',
      parcelas: 3,
      mes_inicio: '2026-11',
    });

    // Verifica: a folha fechou (o título sumiu) e a lista foi pedida de novo
    // (ao abrir a aba e depois de salvar).
    await waitFor(() => expect(screen.queryByRole('header', { name: 'Nova dívida' })).toBeNull());
    await waitFor(() => expect(enderecosPedidos('/api/dividas/')).toHaveLength(3));
    // São 3 endereços porque o POST também vai para /api/dividas/: o GET da
    // abertura, o POST e o GET depois de salvar. Os GETs são dois:
    expect(chamadas('GET', '/api/dividas/')).toHaveLength(2);
  });

  it('quando o servidor recusa (400), mostra a mensagem e a folha continua aberta (caso 8)', async () => {
    respostaDoCadastro = async () =>
      respostaFalsa(400, {
        mes_inicio: ['Mês inválido. Use o formato AAAA-MM, ex.: 2026-11.'],
      });
    await abrirNovaDivida();

    // Todos os campos válidos para o app: quem recusa é o servidor falso.
    await preencherNovaDivida();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Mês inválido. Use o formato AAAA-MM, ex.: 2026-11.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Nova dívida' })).toBeOnTheScreen();
  });
});

// ---------------------------------------------------------------------------
// A folha da dívida (casos 9 a 11)
// ---------------------------------------------------------------------------
describe('Folha da dívida', () => {
  it('mostra o credor, o motivo e o resumo "R$ 1.000,00 em 3x · falta R$ 666,67" (caso 9)', async () => {
    await abrirFolhaDaDivida(ROTULO_TIA);

    expect(screen.getByRole('header', { name: 'Tia Maria' })).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.000,00 em 3x · falta R$ 666,67')).toBeOnTheScreen();
  });

  it('lista as parcelas com "Paga", "Atrasada" e "A pagar" (caso 9)', async () => {
    respostaDasDividas = async () => respostaFalsa(200, [DIVIDA_COM_ATRASO]);
    await abrirFolhaDaDivida(ROTULO_COM_ATRASO);

    // Cada parcela é um checkbox (papel "checkbox"), achado pelo nome que o
    // leitor de tela fala. O within procura só dentro daquela linha.
    const paga = screen.getByRole('checkbox', {
      name: 'Parcela 1 de 3, setembro de 2026, 333,33 reais',
    });
    const atrasada = screen.getByRole('checkbox', {
      name: 'Parcela 2 de 3, outubro de 2026, 333,33 reais, atrasada',
    });
    const aPagar = screen.getByRole('checkbox', {
      name: 'Parcela 3 de 3, novembro de 2026, 333,34 reais',
    });
    expect(within(paga).getByText('Paga')).toBeOnTheScreen();
    expect(within(atrasada).getByText('Atrasada')).toBeOnTheScreen();
    expect(within(aPagar).getByText('A pagar')).toBeOnTheScreen();
  });

  it('só a parcela paga está marcada (checked) (caso 9)', async () => {
    respostaDasDividas = async () => respostaFalsa(200, [DIVIDA_COM_ATRASO]);
    await abrirFolhaDaDivida(ROTULO_COM_ATRASO);

    const caixas = screen.getAllByRole('checkbox');
    expect(caixas).toHaveLength(3);
    expect(caixas[0]).toBeChecked();
    expect(caixas[1]).not.toBeChecked();
    expect(caixas[2]).not.toBeChecked();
  });

  it('as dicas são "Toque para marcar como paga" e "Toque para desmarcar" (caso 9)', async () => {
    await abrirFolhaDaDivida(ROTULO_TIA);

    expect(screen.getByRole('checkbox', { name: PARCELA_1_PAGA })).toHaveProp(
      'accessibilityHint',
      'Toque para desmarcar',
    );
    expect(screen.getByRole('checkbox', { name: PARCELA_2 })).toHaveProp(
      'accessibilityHint',
      'Toque para marcar como paga',
    );
  });

  it('tocar numa parcela a pagar manda PATCH com {paga: true} e ela fica marcada (caso 10)', async () => {
    // Prepara: o servidor responde a dívida com a parcela 2 paga.
    const comParcela2Paga = criarDivida({
      parcelas_pagas: 2,
      parcelas: [
        parcela(1, '2026-10', '333.33', true, false),
        parcela(2, '2026-11', '333.33', true, false),
        parcela(3, '2026-12', '333.34', false, false),
      ],
    });
    respostaDaParcela = async () => respostaFalsa(200, comParcela2Paga);
    await abrirFolhaDaDivida(ROTULO_TIA);

    await fireEvent.press(screen.getByRole('checkbox', { name: PARCELA_2 }));

    // Verifica: o PATCH foi para a parcela 2, com o token e o corpo certo...
    await waitFor(() => expect(chamadas('PATCH', '/api/parcelas/2/')).toHaveLength(1));
    const [endereco, opcoes] = chamadas('PATCH', '/api/parcelas/2/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/parcelas/2/`);
    expect(opcoes).toMatchObject({ headers: { Authorization: 'Token token-falso' } });
    expect(corpoDe('PATCH', '/api/parcelas/2/')).toEqual({ paga: true });
    // ...e a linha agora aparece marcada, com a dívida da resposta.
    await waitFor(() => expect(screen.getByRole('checkbox', { name: PARCELA_2 })).toBeChecked());
  });

  it('tocar numa parcela paga manda PATCH com {paga: false} e ela é desmarcada (caso 10)', async () => {
    const semParcela1Paga = criarDivida({
      parcelas_pagas: 0,
      parcelas: [
        parcela(1, '2026-10', '333.33', false, false),
        parcela(2, '2026-11', '333.33', false, false),
        parcela(3, '2026-12', '333.34', false, false),
      ],
    });
    respostaDaParcela = async () => respostaFalsa(200, semParcela1Paga);
    await abrirFolhaDaDivida(ROTULO_TIA);

    await fireEvent.press(screen.getByRole('checkbox', { name: PARCELA_1_PAGA }));

    await waitFor(() => expect(chamadas('PATCH', '/api/parcelas/1/')).toHaveLength(1));
    expect(corpoDe('PATCH', '/api/parcelas/1/')).toEqual({ paga: false });
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: PARCELA_1_PAGA })).not.toBeChecked(),
    );
  });

  it('se o servidor dá erro ao marcar, mostra a mensagem e a linha continua como estava (caso 10)', async () => {
    respostaDaParcela = async () => respostaFalsa(500);
    await abrirFolhaDaDivida(ROTULO_TIA);

    await fireEvent.press(screen.getByRole('checkbox', { name: PARCELA_2 }));

    expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: PARCELA_2 })).not.toBeChecked();
  });

  it('fechar a folha depois de marcar uma parcela busca a lista de novo (caso 10)', async () => {
    await abrirFolhaDaDivida(ROTULO_TIA);
    await fireEvent.press(screen.getByRole('checkbox', { name: PARCELA_2 }));
    await waitFor(() => expect(chamadas('PATCH', '/api/parcelas/2/')).toHaveLength(1));

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));

    // A lista foi pedida ao abrir a aba e de novo ao fechar a folha.
    await waitFor(() => expect(chamadas('GET', '/api/dividas/')).toHaveLength(2));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Apagar dívida' })).toBeNull(),
    );
  });

  it('"Apagar dívida" pede confirmação no primeiro toque e não chama a API (caso 11)', async () => {
    await abrirFolhaDaDivida(ROTULO_TIA);

    await fireEvent.press(screen.getByRole('button', { name: 'Apagar dívida' }));

    expect(screen.getByRole('button', { name: 'Toque de novo para apagar' })).toBeOnTheScreen();
    expect(screen.getByText('As 3 parcelas também serão apagadas.')).toBeOnTheScreen();
    expect(chamadas('DELETE', '/api/dividas/')).toHaveLength(0);
  });

  it('com uma parcela só, o aviso diz "A parcela também será apagada." (caso 11)', async () => {
    const umaParcela = criarDivida({
      valor_total: '500.00',
      total_parcelas: 1,
      parcelas_pagas: 0,
      valor_pago: '0.00',
      valor_restante: '500.00',
      proxima_parcela: { id: 1, numero: 1, mes: '2026-11', valor: '500.00', atrasada: false },
      parcelas: [parcela(1, '2026-11', '500.00', false, false)],
    });
    respostaDasDividas = async () => respostaFalsa(200, [umaParcela]);
    await render(<DividasScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Dívida com Tia Maria/ }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Apagar dívida' }));

    expect(screen.getByText('A parcela também será apagada.')).toBeOnTheScreen();
  });

  it('o segundo toque faz o DELETE, fecha a folha e busca a lista de novo (caso 11)', async () => {
    await abrirFolhaDaDivida(ROTULO_TIA);
    await fireEvent.press(screen.getByRole('button', { name: 'Apagar dívida' }));

    // Depois de apagar, a lista volta vazia.
    respostaDasDividas = async () => respostaFalsa(200, []);
    await fireEvent.press(screen.getByRole('button', { name: 'Toque de novo para apagar' }));

    await waitFor(() => expect(chamadas('DELETE', '/api/dividas/1/')).toHaveLength(1));
    const [endereco, opcoes] = chamadas('DELETE', '/api/dividas/1/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/dividas/1/`);
    expect(opcoes).toMatchObject({ headers: { Authorization: 'Token token-falso' } });
    // A folha fechou e a lista nova (vazia) apareceu.
    expect(await screen.findByText('Nenhuma dívida cadastrada.')).toBeOnTheScreen();
    expect(chamadas('GET', '/api/dividas/')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Apagar dívida' })).toBeNull();
  });

  it('tocar numa parcela cancela a confirmação de apagar (caso 11)', async () => {
    await abrirFolhaDaDivida(ROTULO_TIA);
    await fireEvent.press(screen.getByRole('button', { name: 'Apagar dívida' }));
    expect(screen.getByRole('button', { name: 'Toque de novo para apagar' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('checkbox', { name: PARCELA_2 }));

    // Voltou ao botão normal, sem o aviso, e nada foi apagado. O act espera o
    // pedido da parcela terminar antes de olharmos a tela.
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Apagar dívida' })).toBeOnTheScreen();
    expect(screen.queryByText('As 3 parcelas também serão apagadas.')).toBeNull();
    expect(chamadas('DELETE', '/api/dividas/')).toHaveLength(0);
  });
});

// ===========================================================================
// Módulo 15b: editar dívida
// ===========================================================================

// Uma dívida sem nenhuma parcela paga (a única que pode mudar valor, parcelas
// e mês), começando em novembro de 2026.
const DIVIDA_SEM_PAGAS = criarDivida({
  mes_inicio: '2026-11',
  parcelas_pagas: 0,
  valor_pago: '0.00',
  valor_restante: '1000.00',
  proxima_parcela: { id: 1, numero: 1, mes: '2026-11', valor: '333.33', atrasada: false },
  parcelas: [
    parcela(1, '2026-11', '333.33', false, false),
    parcela(2, '2026-12', '333.33', false, false),
    parcela(3, '2027-01', '333.34', false, false),
  ],
});

// Abre a folha "Editar dívida": mostra a aba com a dívida dada, toca no
// cartão, toca em "Editar dívida" e espera o título da folha de cadastro.
async function abrirEdicaoDaDivida(divida: Record<string, unknown>) {
  respostaDasDividas = async () => respostaFalsa(200, [divida]);
  await render(<DividasScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: /^Dívida com Tia Maria/ }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Editar dívida' }));
  await screen.findByRole('header', { name: 'Editar dívida' });
}

describe('Editar dívida (15b)', () => {
  it('"Editar dívida" abre a folha com o título e os campos preenchidos (caso 1)', async () => {
    // Confere o que a pessoa vê ao abrir: título "Editar dívida" e cada campo
    // já com os dados atuais (valor formatado, mês como MM/AAAA).
    await abrirEdicaoDaDivida(DIVIDA_SEM_PAGAS);

    expect(screen.getByLabelText('Para quem')).toHaveDisplayValue('Tia Maria');
    expect(screen.getByLabelText('Motivo (opcional)')).toHaveDisplayValue('Empréstimo do carro');
    expect(screen.getByLabelText('Valor total')).toHaveDisplayValue('1.000,00');
    expect(screen.getByLabelText('Parcelas')).toHaveDisplayValue('3');
    expect(screen.getByLabelText('Mês da primeira parcela (MM/AAAA)')).toHaveDisplayValue(
      '11/2026',
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeOnTheScreen();
    // A folha das parcelas fechou para dar lugar à de edição.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Apagar dívida' })).toBeNull());
  });

  it('mudar o valor e salvar manda o PATCH com os dados novos, fecha a folha e relê a lista (caso 2)', async () => {
    // Confere o fluxo completo de salvar: o corpo do PATCH no formato da API,
    // a folha fechando e a lista sendo pedida de novo.
    await abrirEdicaoDaDivida(DIVIDA_SEM_PAGAS);

    await fireEvent.changeText(screen.getByLabelText('Valor total'), '1.200,00');
    await fireEvent.changeText(screen.getByLabelText('Parcelas'), '4');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(chamadas('PATCH', '/api/dividas/1/')).toHaveLength(1));
    const [endereco, opcoes] = chamadas('PATCH', '/api/dividas/1/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/dividas/1/`);
    expect(opcoes).toMatchObject({
      headers: { Authorization: 'Token token-falso', 'Content-Type': 'application/json' },
    });
    expect(corpoDe('PATCH', '/api/dividas/1/')).toEqual({
      credor: 'Tia Maria',
      motivo: 'Empréstimo do carro',
      valor_total: '1200.00',
      parcelas: 4,
      mes_inicio: '2026-11',
    });
    await waitFor(() => expect(screen.queryByRole('header', { name: 'Editar dívida' })).toBeNull());
    await waitFor(() => expect(chamadas('GET', '/api/dividas/')).toHaveLength(2));
  });

  it('com parcela paga, esconde valor, parcelas e mês, mostra o aviso e salva só credor e motivo (caso 3)', async () => {
    // DIVIDA_TIA tem uma parcela paga. Confere que os campos travados não
    // aparecem, que o aviso aparece e que o PATCH leva só os dois campos livres.
    await abrirEdicaoDaDivida(DIVIDA_TIA);

    expect(screen.queryByLabelText('Valor total')).toBeNull();
    expect(screen.queryByLabelText('Parcelas')).toBeNull();
    expect(screen.queryByLabelText('Mês da primeira parcela (MM/AAAA)')).toBeNull();
    expect(
      screen.getByText(
        'Com parcela paga, só dá para mudar para quem e o motivo. Para mudar o valor, desmarque as parcelas pagas.',
      ),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Para quem'), 'Tio João');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(chamadas('PATCH', '/api/dividas/1/')).toHaveLength(1));
    expect(corpoDe('PATCH', '/api/dividas/1/')).toEqual({
      credor: 'Tio João',
      motivo: 'Empréstimo do carro',
    });
  });

  it('se a API recusa a edição, a folha continua aberta e mostra a mensagem (caso 4)', async () => {
    // O servidor falso responde 400 (mesmo formato do erro do cadastro).
    // Confere que a pessoa vê a mensagem e não perde o que digitou.
    respostaDaEdicao = async () =>
      respostaFalsa(400, {
        mes_inicio: ['Mês inválido. Use o formato AAAA-MM, ex.: 2026-11.'],
      });
    await abrirEdicaoDaDivida(DIVIDA_SEM_PAGAS);

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Mês inválido. Use o formato AAAA-MM, ex.: 2026-11.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Editar dívida' })).toBeOnTheScreen();
  });
});

// ===========================================================================
// Módulo 14b: gastos fixos na aba "A pagar"
// ===========================================================================

// Abre a folha "Novo gasto fixo": renderiza a aba, toca no botão e espera o
// título da folha (cabeçalho; o botão tem o mesmo nome).
async function abrirNovoFixo() {
  await render(<DividasScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Novo gasto fixo' }));
  await screen.findByRole('header', { name: 'Novo gasto fixo' });
}

// Preenche os cinco campos da folha do gasto fixo, cada um com um valor válido
// por padrão; o teste passa só o que quer mudar.
async function preencherFixo(
  campos: { nome?: string; valor?: string; dia?: string; mes?: string; trecho?: string } = {},
) {
  const {
    nome = 'Apartamento',
    valor = '1.200,00',
    dia = '10',
    mes = '11/2026',
    trecho = 'DIRECIONAL',
  } = campos;
  await fireEvent.changeText(screen.getByLabelText('Nome'), nome);
  await fireEvent.changeText(screen.getByLabelText('Valor por mês'), valor);
  await fireEvent.changeText(screen.getByLabelText('Dia do vencimento (opcional)'), dia);
  await fireEvent.changeText(screen.getByLabelText('Começa em (MM/AAAA)'), mes);
  await fireEvent.changeText(
    screen.getByLabelText('Trecho para achar o pagamento (opcional)'),
    trecho,
  );
}

// Abre a folha de editar: renderiza a aba, toca na linha do fixo e espera o
// botão "Apagar gasto fixo" (só existe na folha de editar).
async function abrirFolhaDoFixo(rotuloDaLinha: string) {
  await render(<DividasScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: rotuloDaLinha }));
  await screen.findByRole('button', { name: 'Apagar gasto fixo' });
}

describe('Aba A pagar: título e seções (14b, caso 7)', () => {
  it('mostra o título "A pagar", as seções "Gastos fixos" e "Dívidas" e os dois botões de novo (caso 7)', async () => {
    await render(<DividasScreen />);

    expect(await screen.findByRole('header', { name: 'A pagar' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Gastos fixos' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Dívidas' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Novo gasto fixo' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Nova dívida' })).toBeOnTheScreen();
  });
});

describe('Gastos fixos na lista (14b, casos 8 a 12)', () => {
  it('fixo a pagar mostra nome, "R$ 1.200,00 · vence dia 10", "A pagar" e o botão "Marcar pago" (caso 8)', async () => {
    respostaDosFixos = async () => respostaFalsa(200, [FIXO_A_PAGAR]);

    await render(<DividasScreen />);

    // A linha é um botão com o nome completo e a dica de editar. O within
    // procura os textos só dentro dela (o texto "A pagar" também é o título
    // da tela).
    const linha = await screen.findByRole('button', { name: ROTULO_FIXO_A_PAGAR });
    expect(linha).toHaveProp('accessibilityHint', 'Toque para editar ou apagar');
    expect(within(linha).getByText('Apartamento')).toBeOnTheScreen();
    expect(within(linha).getByText('R$ 1.200,00 · vence dia 10')).toBeOnTheScreen();
    expect(within(linha).getByText('A pagar')).toBeOnTheScreen();
    const botao = screen.getByRole('button', { name: MARCAR_APARTAMENTO });
    expect(within(botao).getByText('Marcar pago')).toBeOnTheScreen();
  });

  it('"Marcar pago" faz o PUT do pagamento do mês, relê a lista e passa a mostrar "Pago" (caso 8)', async () => {
    respostaDosFixos = async () => respostaFalsa(200, [FIXO_A_PAGAR]);
    await render(<DividasScreen />);

    // O servidor passa a responder o fixo pago (a leitura de depois do PUT).
    respostaDoPagamento = async () => respostaFalsa(200, FIXO_PAGO_MANUAL);
    await screen.findByRole('button', { name: MARCAR_APARTAMENTO });
    respostaDosFixos = async () => respostaFalsa(200, [FIXO_PAGO_MANUAL]);
    await fireEvent.press(screen.getByRole('button', { name: MARCAR_APARTAMENTO }));

    await waitFor(() =>
      expect(chamadas('PUT', '/api/gastos-fixos/1/pagamentos/2026-10/')).toHaveLength(1),
    );
    const [endereco, opcoes] = chamadas('PUT', '/api/gastos-fixos/1/pagamentos/2026-10/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/gastos-fixos/1/pagamentos/2026-10/`);
    expect(opcoes).toMatchObject({ headers: { Authorization: 'Token token-falso' } });
    // A lista foi lida de novo e a linha agora está paga.
    expect(
      await screen.findByRole('button', { name: ROTULO_FIXO_PAGO_MANUAL }),
    ).toBeOnTheScreen();
    expect(chamadas('GET', '/api/gastos-fixos/')).toHaveLength(2);
    expect(screen.getByRole('button', { name: DESMARCAR_APARTAMENTO })).toBeOnTheScreen();
  });

  it('fixo pago manual mostra "Pago" e "Desmarcar", que faz o DELETE do pagamento e relê (caso 9)', async () => {
    respostaDosFixos = async () => respostaFalsa(200, [FIXO_PAGO_MANUAL]);
    await render(<DividasScreen />);

    const linha = await screen.findByRole('button', { name: ROTULO_FIXO_PAGO_MANUAL });
    expect(within(linha).getByText('Pago')).toBeOnTheScreen();
    const botao = screen.getByRole('button', { name: DESMARCAR_APARTAMENTO });
    expect(within(botao).getByText('Desmarcar')).toBeOnTheScreen();

    respostaDosFixos = async () => respostaFalsa(200, [FIXO_A_PAGAR]);
    await fireEvent.press(botao);

    await waitFor(() =>
      expect(chamadas('DELETE', '/api/gastos-fixos/1/pagamentos/2026-10/')).toHaveLength(1),
    );
    const [endereco, opcoes] = chamadas('DELETE', '/api/gastos-fixos/1/pagamentos/2026-10/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/gastos-fixos/1/pagamentos/2026-10/`);
    expect(opcoes).toMatchObject({ headers: { Authorization: 'Token token-falso' } });
    expect(await screen.findByRole('button', { name: MARCAR_APARTAMENTO })).toBeOnTheScreen();
    expect(chamadas('GET', '/api/gastos-fixos/')).toHaveLength(2);
  });

  it('fixo pago automático mostra "Pago (achado nas transações)" e não tem botão (caso 10)', async () => {
    const internet = criarFixo({
      id: 2,
      nome: 'Internet',
      valor: '99.90',
      dia_vencimento: 5,
      este_mes: { mes: '2026-10', situacao: 'pago_automatico' },
    });
    respostaDosFixos = async () => respostaFalsa(200, [internet]);

    await render(<DividasScreen />);

    const linha = await screen.findByRole('button', {
      name: 'Internet, 99,90 reais por mês, vence dia 5. Pago em outubro, achado nas transações.',
    });
    expect(within(linha).getByText('Pago (achado nas transações)')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^(Marcar|Desmarcar)/ })).toBeNull();
  });

  it('fixo que ainda não começou mostra "Começa em novembro de 2026" e não tem botão (caso 10)', async () => {
    const academia = criarFixo({
      id: 3,
      nome: 'Academia',
      valor: '80.00',
      dia_vencimento: 15,
      mes_inicio: '2026-11',
      este_mes: { mes: '2026-10', situacao: 'nao_comecou' },
    });
    respostaDosFixos = async () => respostaFalsa(200, [academia]);

    await render(<DividasScreen />);

    const linha = await screen.findByRole('button', {
      name: 'Academia, 80,00 reais por mês, vence dia 15. Começa em novembro de 2026.',
    });
    expect(within(linha).getByText('Começa em novembro de 2026')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^(Marcar|Desmarcar)/ })).toBeNull();
  });

  it('fixo sem dia de vencimento mostra só o valor, sem "vence dia" (caso 10)', async () => {
    const conducao = criarFixo({
      id: 4,
      nome: 'Condução',
      valor: '250.00',
      dia_vencimento: null,
    });
    respostaDosFixos = async () => respostaFalsa(200, [conducao]);

    await render(<DividasScreen />);

    expect(await screen.findByText('R$ 250,00')).toBeOnTheScreen();
    expect(screen.queryByText(/vence dia/)).toBeNull();
  });

  it('sem fixos, avisa "Nenhum gasto fixo cadastrado." e as dívidas aparecem normalmente (caso 11)', async () => {
    // O servidor falso já responde a lista de fixos vazia por padrão.
    await render(<DividasScreen />);

    expect(await screen.findByText('Nenhum gasto fixo cadastrado.')).toBeOnTheScreen();
    expect(screen.getByText('Tia Maria')).toBeOnTheScreen();
  });

  it('com erro nos fixos, a tela inteira mostra o erro e "Tentar de novo" busca tudo de novo (caso 11)', async () => {
    respostaDosFixos = async () => respostaFalsa(500);

    await render(<DividasScreen />);

    expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeOnTheScreen();

    // O servidor se recupera.
    respostaDosFixos = async () => respostaFalsa(200, [FIXO_A_PAGAR]);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('button', { name: ROTULO_FIXO_A_PAGAR })).toBeOnTheScreen();
    expect(screen.getByText('Tia Maria')).toBeOnTheScreen();
    expect(chamadas('GET', '/api/gastos-fixos/')).toHaveLength(2);
  });

  it('se o PUT dá erro, mostra a mensagem e a linha continua como estava (caso 12)', async () => {
    respostaDosFixos = async () => respostaFalsa(200, [FIXO_A_PAGAR]);
    respostaDoPagamento = async () => respostaFalsa(500);
    await render(<DividasScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: MARCAR_APARTAMENTO }));

    expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ROTULO_FIXO_A_PAGAR })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: MARCAR_APARTAMENTO })).toBeOnTheScreen();
  });
});

describe('Folha "Novo gasto fixo" (14b, caso 13)', () => {
  it('mostra a explicação "Conta como saída todo mês até ser pago. Vale até você apagar." (caso 13)', async () => {
    await abrirNovoFixo();

    expect(
      screen.getByText('Conta como saída todo mês até ser pago. Vale até você apagar.'),
    ).toBeOnTheScreen();
  });

  it('sem nome, avisa "Informe o nome do gasto." e não chama a API (caso 13)', async () => {
    await abrirNovoFixo();

    await preencherFixo({ nome: '' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome do gasto.')).toBeOnTheScreen();
    expect(chamadas('POST', '/api/gastos-fixos/')).toHaveLength(0);
  });

  it('valor que não é número avisa "Digite um valor, ex.: 1.200,00." e não chama a API (caso 13)', async () => {
    await abrirNovoFixo();

    await preencherFixo({ valor: 'abc' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Digite um valor, ex.: 1.200,00.')).toBeOnTheScreen();
    expect(chamadas('POST', '/api/gastos-fixos/')).toHaveLength(0);
  });

  it('valor zero avisa "O valor precisa ser maior que zero." e não chama a API (caso 13)', async () => {
    await abrirNovoFixo();

    await preencherFixo({ valor: '0' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('O valor precisa ser maior que zero.')).toBeOnTheScreen();
    expect(chamadas('POST', '/api/gastos-fixos/')).toHaveLength(0);
  });

  it.each(['0', '32'])(
    'com o dia %s avisa "O dia do vencimento precisa ficar entre 1 e 31." e não chama a API (caso 13)',
    async (dia) => {
      await abrirNovoFixo();

      await preencherFixo({ dia });
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

      expect(
        await screen.findByText('O dia do vencimento precisa ficar entre 1 e 31.'),
      ).toBeOnTheScreen();
      expect(chamadas('POST', '/api/gastos-fixos/')).toHaveLength(0);
    },
  );

  it.each(['11/26', ''])(
    'com o mês "%s" avisa "Digite o mês como MM/AAAA." e não chama a API (caso 13)',
    async (mes) => {
      await abrirNovoFixo();

      await preencherFixo({ mes });
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Digite o mês como MM/AAAA.')).toBeOnTheScreen();
      expect(chamadas('POST', '/api/gastos-fixos/')).toHaveLength(0);
    },
  );

  it('trecho com menos de 3 letras avisa "O trecho precisa ter pelo menos 3 letras." e não chama a API (caso 13)', async () => {
    await abrirNovoFixo();

    await preencherFixo({ trecho: 'DI' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('O trecho precisa ter pelo menos 3 letras.'),
    ).toBeOnTheScreen();
    expect(chamadas('POST', '/api/gastos-fixos/')).toHaveLength(0);
  });

  it('com vários erros, só o primeiro aparece (na ordem do formulário) (caso 13)', async () => {
    await abrirNovoFixo();

    // Nome vazio e valor inválido ao mesmo tempo: só o do nome.
    await preencherFixo({ nome: '', valor: 'abc' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome do gasto.')).toBeOnTheScreen();
    expect(screen.queryByText('Digite um valor, ex.: 1.200,00.')).toBeNull();
  });

  it('salvar manda o POST com o corpo exato, fecha a folha e relê a lista (caso 13)', async () => {
    await abrirNovoFixo();

    await preencherFixo({
      nome: 'Apartamento',
      valor: '1.200,00',
      dia: '10',
      mes: '11/2026',
      trecho: 'DIRECIONAL',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(chamadas('POST', '/api/gastos-fixos/')).toHaveLength(1));
    const [endereco, opcoes] = chamadas('POST', '/api/gastos-fixos/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/gastos-fixos/`);
    expect(opcoes).toMatchObject({
      headers: { Authorization: 'Token token-falso', 'Content-Type': 'application/json' },
    });
    expect(corpoDe('POST', '/api/gastos-fixos/')).toEqual({
      nome: 'Apartamento',
      valor: '1200.00',
      dia_vencimento: 10,
      mes_inicio: '2026-11',
      trecho_descricao: 'DIRECIONAL',
    });
    await waitFor(() =>
      expect(screen.queryByRole('header', { name: 'Novo gasto fixo' })).toBeNull(),
    );
    await waitFor(() => expect(chamadas('GET', '/api/gastos-fixos/')).toHaveLength(2));
  });

  it('sem dia de vencimento, o corpo do POST leva dia_vencimento null (caso 13)', async () => {
    await abrirNovoFixo();

    await preencherFixo({ dia: '' });
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(chamadas('POST', '/api/gastos-fixos/')).toHaveLength(1));
    expect(corpoDe('POST', '/api/gastos-fixos/')).toEqual({
      nome: 'Apartamento',
      valor: '1200.00',
      dia_vencimento: null,
      mes_inicio: '2026-11',
      trecho_descricao: 'DIRECIONAL',
    });
  });

  it('quando o servidor recusa (400), mostra a mensagem e a folha continua aberta (caso 13)', async () => {
    respostaDoCadastroFixo = async () =>
      respostaFalsa(400, { trecho_descricao: ['O trecho precisa ter pelo menos 3 letras.'] });
    await abrirNovoFixo();

    // Tudo válido para o app: quem recusa é o servidor falso.
    await preencherFixo();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('O trecho precisa ter pelo menos 3 letras.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Novo gasto fixo' })).toBeOnTheScreen();
  });
});

describe('Folha do gasto fixo (editar) (14b, caso 14)', () => {
  beforeEach(() => {
    respostaDosFixos = async () => respostaFalsa(200, [FIXO_A_PAGAR]);
  });

  it('abre com o nome no título e os campos preenchidos com os dados do gasto (caso 14)', async () => {
    await abrirFolhaDoFixo(ROTULO_FIXO_A_PAGAR);

    expect(screen.getByRole('header', { name: 'Apartamento' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Nome')).toHaveDisplayValue('Apartamento');
    // O formato exato do valor na tela não é fixado pelo contrato (1.200,00 ou
    // 1200,00); o que importa é aparecer o 1200 com os centavos.
    expect(screen.getByLabelText('Valor por mês')).toHaveDisplayValue(/^1\.?200[,.]00$/);
    expect(screen.getByLabelText('Dia do vencimento (opcional)')).toHaveDisplayValue('10');
    expect(screen.getByLabelText('Começa em (MM/AAAA)')).toHaveDisplayValue('09/2026');
    expect(
      screen.getByLabelText('Trecho para achar o pagamento (opcional)'),
    ).toHaveDisplayValue('DIRECIONAL');
  });

  it('salvar manda o PATCH com os campos e relê a lista (caso 14)', async () => {
    await abrirFolhaDoFixo(ROTULO_FIXO_A_PAGAR);

    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Aluguel');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(chamadas('PATCH', '/api/gastos-fixos/1/')).toHaveLength(1));
    const [endereco, opcoes] = chamadas('PATCH', '/api/gastos-fixos/1/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/gastos-fixos/1/`);
    expect(opcoes).toMatchObject({
      headers: { Authorization: 'Token token-falso', 'Content-Type': 'application/json' },
    });
    expect(corpoDe('PATCH', '/api/gastos-fixos/1/')).toEqual({
      nome: 'Aluguel',
      valor: '1200.00',
      dia_vencimento: 10,
      mes_inicio: '2026-09',
      trecho_descricao: 'DIRECIONAL',
    });
    await waitFor(() => expect(chamadas('GET', '/api/gastos-fixos/')).toHaveLength(2));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Apagar gasto fixo' })).toBeNull(),
    );
  });

  it('"Apagar gasto fixo" pede confirmação no primeiro toque e não chama a API (caso 14)', async () => {
    await abrirFolhaDoFixo(ROTULO_FIXO_A_PAGAR);

    await fireEvent.press(screen.getByRole('button', { name: 'Apagar gasto fixo' }));

    expect(screen.getByRole('button', { name: 'Toque de novo para apagar' })).toBeOnTheScreen();
    expect(
      screen.getByText('O gasto fixo e as marcações de pago serão apagados.'),
    ).toBeOnTheScreen();
    expect(chamadas('DELETE', '/api/gastos-fixos/')).toHaveLength(0);
  });

  it('tocar num campo cancela a confirmação de apagar (caso 14)', async () => {
    await abrirFolhaDoFixo(ROTULO_FIXO_A_PAGAR);
    await fireEvent.press(screen.getByRole('button', { name: 'Apagar gasto fixo' }));
    expect(screen.getByRole('button', { name: 'Toque de novo para apagar' })).toBeOnTheScreen();

    // Tocar no campo (o evento "focus") desfaz o pedido de confirmação.
    await fireEvent(screen.getByLabelText('Nome'), 'focus');

    expect(screen.getByRole('button', { name: 'Apagar gasto fixo' })).toBeOnTheScreen();
    expect(
      screen.queryByText('O gasto fixo e as marcações de pago serão apagados.'),
    ).toBeNull();
    expect(chamadas('DELETE', '/api/gastos-fixos/')).toHaveLength(0);
  });

  it('o segundo toque faz o DELETE, fecha a folha e relê a lista (caso 14)', async () => {
    await abrirFolhaDoFixo(ROTULO_FIXO_A_PAGAR);
    await fireEvent.press(screen.getByRole('button', { name: 'Apagar gasto fixo' }));

    // Depois de apagar, a lista de fixos volta vazia.
    respostaDosFixos = async () => respostaFalsa(200, []);
    await fireEvent.press(screen.getByRole('button', { name: 'Toque de novo para apagar' }));

    await waitFor(() => expect(chamadas('DELETE', '/api/gastos-fixos/1/')).toHaveLength(1));
    const [endereco, opcoes] = chamadas('DELETE', '/api/gastos-fixos/1/')[0];
    expect(endereco).toBe(`${ENDERECO_BASE}/api/gastos-fixos/1/`);
    expect(opcoes).toMatchObject({ headers: { Authorization: 'Token token-falso' } });
    expect(await screen.findByText('Nenhum gasto fixo cadastrado.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Apagar gasto fixo' })).toBeNull();
  });
});
