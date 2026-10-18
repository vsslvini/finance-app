// Testes da tela Cartões (módulo 6): um cartão na tela para cada cartão de
// crédito, com a fatura aberta, o limite e as datas. A tela pede
// GET /api/contas/ (que traz contas correntes e cartões juntos) e mostra só
// as contas com tipo "cartao".
//
// As peças repetidas (fetch falso, respostas falsas, mensagens, puxar para
// baixo) estão em mobile/testes/ajudantes.ts.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Conta } from '@/api';
import CartoesScreen from '@/app/(abas)/cartoes';

import {
  AVISO_ATUALIZACAO,
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

// ---------------------------------------------------------------------------
// O servidor falso desta tela
//
// Só responde GET /api/contas/, com o que respostaDasContas devolver. Ela
// começa, em cada teste, com as três contas acima (veja o beforeEach); um
// teste pode trocá-la, para fingir outros dados ou um erro. Qualquer outro
// pedido dá erro alto.
// ---------------------------------------------------------------------------
let respostaDasContas: () => Promise<Response>;

beforeEach(() => {
  respostaDasContas = async () => respostaFalsa(200, TODAS_AS_CONTAS);
  fetchFalso.mockImplementation(async (endereco, opcoes) => {
    const url = String(endereco);
    if (url.includes('/api/contas/')) {
      return respostaDasContas();
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
