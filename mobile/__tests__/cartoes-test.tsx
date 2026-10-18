// Testes da tela Cartões (módulo 6): um cartão na tela para cada cartão de
// crédito, com a fatura aberta, o limite e as datas. A tela pede
// GET /api/contas/ (que traz contas correntes e cartões juntos) e mostra só
// as contas com tipo "cartao".
//
// Módulo 7b: embaixo dos cartões, a seção "Próximas faturas", com a
// estimativa dos próximos 6 meses que vem de GET /api/faturas-futuras/. A
// tela pede as duas rotas juntas.
//
// As peças repetidas (fetch falso, respostas falsas, mensagens, puxar para
// baixo) estão em mobile/testes/ajudantes.ts.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Conta, FaturasFuturas } from '@/api';
import CartoesScreen from '@/app/(abas)/cartoes';

import {
  AVISO_ATUALIZACAO,
  ENDERECO_BASE,
  MENSAGEM_SERVIDOR,
  enderecosPedidos,
  fetchFalso,
  prepararFetchFalso,
  puxarParaBaixo,
  respostaFalsa,
  respostaSegurada,
} from '../testes/ajudantes';

// Dublê do pacote de ícones (explicado em tela-inicio-test.tsx). O rótulo
// "Fatura aberta" tem um ícone Lucide antes; o falso é um Text simples.
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

// Contas falsas no formato do GET /api/contas/ (ContaSerializer do backend).
// Valores e datas vêm como texto; o que o banco não informa vem null.

// Uma conta corrente: não pode aparecer na tela Cartões.
const NUBANK_CORRENTE: Conta = {
  id: 1,
  nome: 'Conta Corrente',
  nome_banco: 'Nubank',
  tipo: 'corrente',
  saldo: '1250.50',
  limite_total: null,
  limite_disponivel: null,
  data_fechamento: null,
  data_vencimento: null,
};

// Um cartão com tudo informado, menos a data de fechamento (a Pluggy às
// vezes não manda essa data). O saldo do cartão é a fatura aberta.
const MASTERCARD_BLACK: Conta = {
  id: 2,
  nome: 'Mastercard Black',
  nome_banco: 'Nubank',
  tipo: 'cartao',
  saldo: '845.10',
  limite_total: '5000.00',
  limite_disponivel: '4154.90',
  data_fechamento: null,
  data_vencimento: '2026-11-05',
};

// Um cartão sem limites e sem datas.
const INTER_GOLD: Conta = {
  id: 3,
  nome: 'Inter Gold',
  nome_banco: 'Inter',
  tipo: 'cartao',
  saldo: '320.00',
  limite_total: null,
  limite_disponivel: null,
  data_fechamento: null,
  data_vencimento: null,
};

const TODAS_AS_CONTAS = [NUBANK_CORRENTE, MASTERCARD_BLACK, INTER_GOLD];

// Faturas futuras falsas no formato do GET /api/faturas-futuras/ (módulo 7a):
// sempre 6 meses, cada um com o total e os cartões que têm parcela nele.
// A tela não cruza esta lista com a das contas: o nome do banco que aparece
// no detalhe ("Inter: R$ 77,07") vem daqui mesmo.
const SEIS_MESES = ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04'];

// Os 6 meses zerados: nenhuma parcela futura. É a resposta padrão, para os
// testes do módulo 6 (acima do 7b) continuarem como eram. O map cria um mês
// zerado para cada texto da lista SEIS_MESES.
const FATURAS_ZERADAS: FaturasFuturas = {
  meses: SEIS_MESES.map((mes) => ({ mes, total: '0.00', cartoes: [] })),
};

// Como os dados reais: novembro com dois cartões (Inter e PicPay), dezembro
// só com o Inter e os outros 4 meses zerados. O slice(2) pega os meses
// zerados a partir do terceiro (janeiro a abril de 2027), e o "..." coloca
// cada um deles dentro desta lista, depois de dezembro.
const FATURAS_COM_PARCELAS: FaturasFuturas = {
  meses: [
    {
      mes: '2026-11',
      total: '231.26',
      cartoes: [
        { conta: 3, nome_banco: 'Inter', nome_conta: 'Inter Gold', total: '77.07' },
        { conta: 4, nome_banco: 'PicPay', nome_conta: 'PicPay Card', total: '154.19' },
      ],
    },
    {
      mes: '2026-12',
      total: '38.27',
      cartoes: [{ conta: 3, nome_banco: 'Inter', nome_conta: 'Inter Gold', total: '38.27' }],
    },
    ...FATURAS_ZERADAS.meses.slice(2),
  ],
};

// ---------------------------------------------------------------------------
// O servidor falso desta tela
//
// Responde duas rotas:
// - GET /api/contas/, com o que respostaDasContas devolver (começa com as
//   três contas acima);
// - GET /api/faturas-futuras/, com o que respostaDasFaturas devolver (começa
//   com os 6 meses zerados).
// As duas voltam ao padrão antes de cada teste (veja o beforeEach); um teste
// pode trocá-las, para fingir outros dados ou um erro. Qualquer outro pedido
// dá erro alto.
// ---------------------------------------------------------------------------
let respostaDasContas: () => Promise<Response>;
let respostaDasFaturas: () => Promise<Response>;

beforeEach(() => {
  respostaDasContas = async () => respostaFalsa(200, TODAS_AS_CONTAS);
  respostaDasFaturas = async () => respostaFalsa(200, FATURAS_ZERADAS);
  fetchFalso.mockImplementation(async (endereco, opcoes) => {
    const url = String(endereco);
    if (url.includes('/api/contas/')) {
      return respostaDasContas();
    }
    if (url.includes('/api/faturas-futuras/')) {
      return respostaDasFaturas();
    }
    throw new Error(`Pedido inesperado no teste: ${opcoes?.method ?? 'GET'} ${url}`);
  });
});

describe('Tela Cartões', () => {
  it('mostra "Carregando os cartões..." enquanto espera (caso 1)', async () => {
    // Relógio falso e fetch que nunca termina (mesmo cuidado da tela Início).
    jest.useFakeTimers();
    fetchFalso.mockReturnValue(new Promise<Response>(() => {}));

    await render(<CartoesScreen />);

    expect(screen.getByText('Carregando os cartões...')).toBeOnTheScreen();
  });

  it('mostra só os cartões: "Mastercard Black" aparece e "Conta Corrente" não (caso 2)', async () => {
    await render(<CartoesScreen />);

    expect(await screen.findByText('Mastercard Black')).toBeOnTheScreen();
    // queryByText devolve null quando não acha.
    expect(screen.queryByText('Conta Corrente')).toBeNull();
  });

  it('mostra "Fatura aberta", o valor da fatura e o limite disponível (caso 3)', async () => {
    // Prepara: só a conta corrente e o Mastercard, para o "Fatura aberta"
    // aparecer uma vez só (o Inter Gold também teria um).
    respostaDasContas = async () => respostaFalsa(200, [NUBANK_CORRENTE, MASTERCARD_BLACK]);

    await render(<CartoesScreen />);

    expect(await screen.findByText('Fatura aberta')).toBeOnTheScreen();
    expect(screen.getByText('R$ 845,10')).toBeOnTheScreen();
    expect(screen.getByText('Limite disponível: R$ 4.154,90 de R$ 5.000,00')).toBeOnTheScreen();
  });

  it('sem data de fechamento, mostra "Vence em 05/11" e nenhum "Fecha em" (caso 4)', async () => {
    await render(<CartoesScreen />);

    expect(await screen.findByText('Vence em 05/11')).toBeOnTheScreen();
    // O /.../ é uma expressão regular: qualquer texto que contenha "Fecha em".
    expect(screen.queryByText(/Fecha em/)).toBeNull();
  });

  it('com data de fechamento, mostra "Fecha em 28/10 · Vence em 05/11" (caso 4)', async () => {
    // Prepara: o mesmo Mastercard, agora com a data de fechamento. O "..."
    // copia todos os campos e o que vem depois substitui o de mesmo nome.
    const comFechamento: Conta = { ...MASTERCARD_BLACK, data_fechamento: '2026-10-28' };
    respostaDasContas = async () => respostaFalsa(200, [comFechamento]);

    await render(<CartoesScreen />);

    expect(await screen.findByText('Fecha em 28/10 · Vence em 05/11')).toBeOnTheScreen();
  });

  it('com os limites null, mostra "Limite não informado" (caso 5)', async () => {
    // O Inter Gold já vem com os dois limites null.
    await render(<CartoesScreen />);

    expect(await screen.findByText('Limite não informado')).toBeOnTheScreen();
  });

  it('só com contas correntes, avisa "Nenhum cartão encontrado." (caso 6)', async () => {
    respostaDasContas = async () => respostaFalsa(200, [NUBANK_CORRENTE]);

    await render(<CartoesScreen />);

    expect(await screen.findByText('Nenhum cartão encontrado.')).toBeOnTheScreen();
  });

  it('com erro 500, avisa e "Tentar de novo" busca de novo e mostra os cartões (caso 7)', async () => {
    // Prepara: o servidor responde 500 na primeira vez.
    respostaDasContas = async () => respostaFalsa(500);

    await render(<CartoesScreen />);

    expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeOnTheScreen();

    // Prepara: o servidor se recupera e volta a mandar as contas.
    respostaDasContas = async () => respostaFalsa(200, TODAS_AS_CONTAS);

    // Faz: toca em "Tentar de novo".
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    // Verifica: os cartões apareceram e as contas foram pedidas duas vezes.
    expect(await screen.findByText('Mastercard Black')).toBeOnTheScreen();
    expect(enderecosPedidos('/api/contas/')).toHaveLength(2);
  });

  it('puxar para baixo mostra o valor novo sem "Carregando os cartões..." (caso 8)', async () => {
    await render(<CartoesScreen />);
    await screen.findByText('R$ 845,10');

    // Prepara: o próximo pedido fica "segurado" até o teste liberar. Quando
    // chegar, a fatura do Mastercard terá subido para 900,00.
    const faturaNova: Conta = { ...MASTERCARD_BLACK, saldo: '900.00' };
    const segurada = respostaSegurada(
      respostaFalsa(200, [NUBANK_CORRENTE, faturaNova, INTER_GOLD]),
    );
    respostaDasContas = () => segurada.promessa;

    // Faz: puxa a tela e espera o app chegar ao segundo pedido.
    await puxarParaBaixo('rolagem-cartoes');
    await waitFor(() => expect(enderecosPedidos('/api/contas/')).toHaveLength(2));

    // Verifica: no meio da atualização, os dados de antes continuam e a tela
    // de carregamento não tomou o lugar deles.
    expect(screen.queryByText('Carregando os cartões...')).toBeNull();
    expect(screen.getByText('R$ 845,10')).toBeOnTheScreen();

    // Faz: deixa a resposta chegar.
    await act(() => {
      segurada.liberar();
    });

    // Verifica: o valor novo apareceu no lugar do antigo.
    expect(await screen.findByText('R$ 900,00')).toBeOnTheScreen();
    expect(screen.queryByText('R$ 845,10')).toBeNull();
  });

  it('se puxar para baixo falha, os dados ficam e aparece "Não foi possível atualizar agora." (caso 8)', async () => {
    await render(<CartoesScreen />);
    await screen.findByText('R$ 845,10');

    // Prepara: a partir de agora, o servidor responde 500.
    respostaDasContas = async () => respostaFalsa(500);

    await puxarParaBaixo('rolagem-cartoes');

    // Verifica: o aviso aparece, os cartões de antes continuam e não há a
    // mensagem de erro de tela inteira.
    expect(await screen.findByText(AVISO_ATUALIZACAO)).toBeOnTheScreen();
    expect(screen.getByText('R$ 845,10')).toBeOnTheScreen();
    expect(screen.queryByText(MENSAGEM_SERVIDOR)).toBeNull();
  });
});

// Os casos do módulo 7b. Os números "(caso N)" são os da seção "7b: contrato
// da tela" em docs/planos/modulo-7-faturas-futuras.md.
describe('Tela Cartões: Próximas faturas', () => {
  it('mostra "Próximas faturas", a explicação e "Novembro de 2026" com "R$ 231,26" (caso 1)', async () => {
    // Prepara: o servidor manda as faturas com parcelas.
    respostaDasFaturas = async () => respostaFalsa(200, FATURAS_COM_PARCELAS);

    await render(<CartoesScreen />);

    // Verifica: o título da seção é um cabeçalho (o leitor de tela anuncia
    // "cabeçalho"), por isso buscamos pelo papel "header" e pelo nome.
    expect(await screen.findByRole('header', { name: 'Próximas faturas' })).toBeOnTheScreen();
    expect(
      screen.getByText('Estimativa pelas compras parceladas que a Pluggy enviou.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Novembro de 2026')).toBeOnTheScreen();
    expect(screen.getByText('R$ 231,26')).toBeOnTheScreen();
    // A linha inteira é lida de uma vez pelo leitor de tela. Esse rótulo
    // também garante que o valor está na linha de novembro, e não em outra.
    expect(screen.getByLabelText('Novembro de 2026: 231,26 reais')).toBeOnTheScreen();
  });

  it('mês com dois cartões mostra "Inter: R$ 77,07" e "PicPay: R$ 154,19" (caso 2)', async () => {
    respostaDasFaturas = async () => respostaFalsa(200, FATURAS_COM_PARCELAS);

    await render(<CartoesScreen />);

    // Novembro tem dois cartões: aparece uma linha de detalhe para cada um.
    expect(await screen.findByText('Inter: R$ 77,07')).toBeOnTheScreen();
    expect(screen.getByText('PicPay: R$ 154,19')).toBeOnTheScreen();
  });

  it('mês com um cartão só não mostra o detalhe por cartão (caso 2)', async () => {
    respostaDasFaturas = async () => respostaFalsa(200, FATURAS_COM_PARCELAS);

    await render(<CartoesScreen />);

    // Dezembro aparece com o total...
    expect(await screen.findByText('Dezembro de 2026')).toBeOnTheScreen();
    expect(screen.getByText('R$ 38,27')).toBeOnTheScreen();
    // ...mas sem a linha "Inter: R$ 38,27", que só repetiria o mesmo valor.
    expect(screen.queryByText('Inter: R$ 38,27')).toBeNull();
  });

  it('com todos os meses zerados, avisa "Nenhuma parcela futura encontrada." e não mostra meses (caso 3)', async () => {
    // A resposta padrão do servidor falso já é a dos 6 meses zerados.
    await render(<CartoesScreen />);

    expect(await screen.findByText('Nenhuma parcela futura encontrada.')).toBeOnTheScreen();
    // Nenhuma linha de mês: nenhum texto que termine em "de 2026" ou
    // "de 2027". Na expressão regular, [67] aceita o 6 ou o 7, e o $ quer
    // dizer "termina aqui".
    expect(screen.queryByText(/de 202[67]$/)).toBeNull();
  });

  it('pede GET /api/faturas-futuras/ ao abrir (caso 4)', async () => {
    await render(<CartoesScreen />);
    // Espera a tela terminar de carregar antes de olhar os pedidos.
    await screen.findByText('Mastercard Black');

    // Verifica: um pedido só, exatamente para este endereço (sem nada a mais).
    expect(enderecosPedidos('/api/faturas-futuras/')).toEqual([
      `${ENDERECO_BASE}/api/faturas-futuras/`,
    ]);
  });

  it('com erro 500 nas faturas, avisa e "Tentar de novo" busca as contas e as faturas de novo (caso 4)', async () => {
    // Prepara: as contas respondem bem, mas as faturas dão 500.
    respostaDasFaturas = async () => respostaFalsa(500);

    await render(<CartoesScreen />);

    // Verifica: a tela inteira mostra o erro, mesmo com as contas certas.
    expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeOnTheScreen();

    // Prepara: o servidor se recupera e manda as faturas com parcelas.
    respostaDasFaturas = async () => respostaFalsa(200, FATURAS_COM_PARCELAS);

    // Faz: toca em "Tentar de novo".
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    // Verifica: a seção apareceu e as duas rotas foram pedidas duas vezes.
    expect(await screen.findByText('R$ 231,26')).toBeOnTheScreen();
    expect(enderecosPedidos('/api/contas/')).toHaveLength(2);
    expect(enderecosPedidos('/api/faturas-futuras/')).toHaveLength(2);
  });

  it('puxar para baixo busca as contas e as faturas de novo e mostra o valor novo (caso 5)', async () => {
    respostaDasFaturas = async () => respostaFalsa(200, FATURAS_COM_PARCELAS);

    await render(<CartoesScreen />);
    await screen.findByText('R$ 231,26');

    // Prepara: na próxima vez, novembro sobe para 300,00 (o Inter passou de
    // 77,07 para 145,81; 145,81 + 154,19 = 300,00). Os outros 5 meses ficam
    // iguais: o slice(1) pega a lista a partir do segundo mês.
    const novembroNovo = {
      mes: '2026-11',
      total: '300.00',
      cartoes: [
        { conta: 3, nome_banco: 'Inter', nome_conta: 'Inter Gold', total: '145.81' },
        { conta: 4, nome_banco: 'PicPay', nome_conta: 'PicPay Card', total: '154.19' },
      ],
    };
    const faturasNovas: FaturasFuturas = {
      meses: [novembroNovo, ...FATURAS_COM_PARCELAS.meses.slice(1)],
    };
    respostaDasFaturas = async () => respostaFalsa(200, faturasNovas);

    // Faz: puxa a tela para baixo.
    await puxarParaBaixo('rolagem-cartoes');

    // Verifica: o valor novo tomou o lugar do antigo, e as duas rotas foram
    // pedidas de novo.
    expect(await screen.findByText('R$ 300,00')).toBeOnTheScreen();
    expect(screen.queryByText('R$ 231,26')).toBeNull();
    expect(enderecosPedidos('/api/contas/')).toHaveLength(2);
    expect(enderecosPedidos('/api/faturas-futuras/')).toHaveLength(2);
  });

  it('sem nenhum cartão, a seção "Próximas faturas" não aparece (caso 6)', async () => {
    // Prepara: só a conta corrente. As faturas vêm com parcelas de propósito:
    // mesmo com dados, sem cartão na tela a seção não deve aparecer.
    respostaDasContas = async () => respostaFalsa(200, [NUBANK_CORRENTE]);
    respostaDasFaturas = async () => respostaFalsa(200, FATURAS_COM_PARCELAS);

    await render(<CartoesScreen />);

    expect(await screen.findByText('Nenhum cartão encontrado.')).toBeOnTheScreen();
    expect(screen.queryByText('Próximas faturas')).toBeNull();
    expect(screen.queryByText('Novembro de 2026')).toBeNull();
  });
});
