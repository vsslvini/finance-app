// Testes da tela Contas (módulo 6): todas as contas (correntes e cartões),
// agrupadas por banco, com o saldo ou a fatura aberta de cada uma. A tela
// pede GET /api/contas/; o backend já devolve as contas de um mesmo banco
// seguidas, então a tela só junta as vizinhas com o mesmo nome_banco.
//
// As peças repetidas (fetch falso, respostas falsas, mensagens, puxar para
// baixo) estão em mobile/testes/ajudantes.ts.
import { act, render, screen, waitFor } from '@testing-library/react-native';

import type { Conta } from '@/api';
import ContasScreen from '@/app/(abas)/contas';

import {
  MENSAGEM_TOKEN,
  enderecosPedidos,
  fetchFalso,
  prepararFetchFalso,
  puxarParaBaixo,
  respostaFalsa,
  respostaSegurada,
} from '../testes/ajudantes';

// Dublê do pacote de ícones (explicado em tela-inicio-test.tsx). Cada linha
// tem um ícone Lucide (carteira ou cartão); o falso é um Text simples.
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

// Contas falsas no formato do GET /api/contas/, na ordem em que o backend
// manda: as duas do Inter seguidas e depois a do Nubank.
const INTER_CORRENTE: Conta = {
  id: 1,
  nome: 'Conta Corrente',
  nome_banco: 'Inter',
  tipo: 'corrente',
  saldo: '1234.56',
  limite_total: null,
  limite_disponivel: null,
  data_fechamento: null,
  data_vencimento: null,
};

// No cartão, o saldo é a fatura aberta.
const INTER_GOLD: Conta = {
  id: 2,
  nome: 'Inter Gold',
  nome_banco: 'Inter',
  tipo: 'cartao',
  saldo: '320.00',
  limite_total: '2000.00',
  limite_disponivel: '1680.00',
  data_fechamento: null,
  data_vencimento: null,
};

// Uma conta no negativo (cheque especial).
const NUBANK_CORRENTE: Conta = {
  id: 3,
  nome: 'Conta Corrente',
  nome_banco: 'Nubank',
  tipo: 'corrente',
  saldo: '-50.00',
  limite_total: null,
  limite_disponivel: null,
  data_fechamento: null,
  data_vencimento: null,
};

const TODAS_AS_CONTAS = [INTER_CORRENTE, INTER_GOLD, NUBANK_CORRENTE];

// O servidor falso desta tela: só responde GET /api/contas/, com o que
// respostaDasContas devolver (começa com as três contas acima; um teste pode
// trocar). Qualquer outro pedido dá erro alto.
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

describe('Tela Contas', () => {
  it('mostra "Carregando as contas..." enquanto espera (caso 1)', async () => {
    // Relógio falso e fetch que nunca termina (mesmo cuidado da tela Início).
    jest.useFakeTimers();
    fetchFalso.mockReturnValue(new Promise<Response>(() => {}));

    await render(<ContasScreen />);

    expect(screen.getByText('Carregando as contas...')).toBeOnTheScreen();
  });

  it('mostra os grupos "Inter" e "Nubank", nessa ordem, com "Inter Gold" entre os dois (caso 2)', async () => {
    await render(<ContasScreen />);
    await screen.findByText('Inter Gold');

    // Os nomes dos bancos são cabeçalhos (papel "header"), assim o leitor de
    // tela consegue pular de banco em banco. getAllByRole devolve todos, de
    // cima para baixo: o título da tela e os dois bancos.
    const cabecalhos = screen.getAllByRole('header');
    expect(cabecalhos).toHaveLength(3);
    expect(cabecalhos[0]).toHaveTextContent('Contas');
    expect(cabecalhos[1]).toHaveTextContent('Inter');
    expect(cabecalhos[2]).toHaveTextContent('Nubank');

    // O cartão do Inter fica dentro do grupo do Inter: na ordem da tela, ele
    // vem depois do nome "Inter" e antes do nome "Nubank". A expressão
    // regular /^(...)$/ pega só os textos exatamente iguais a um dos três.
    const nomes = screen.getAllByText(/^(Inter|Inter Gold|Nubank)$/);
    expect(nomes).toHaveLength(3);
    expect(nomes[0]).toHaveTextContent('Inter');
    expect(nomes[1]).toHaveTextContent('Inter Gold');
    expect(nomes[2]).toHaveTextContent('Nubank');
  });

  it('a conta corrente mostra o nome, "Saldo" e o valor (caso 3)', async () => {
    // Prepara: só a conta corrente do Inter, para "Conta Corrente" e "Saldo"
    // aparecerem uma vez só (a do Nubank também teria os dois).
    respostaDasContas = async () => respostaFalsa(200, [INTER_CORRENTE]);

    await render(<ContasScreen />);

    expect(await screen.findByText('Conta Corrente')).toBeOnTheScreen();
    expect(screen.getByText('Saldo')).toBeOnTheScreen();
    expect(screen.getByText('R$ 1.234,56')).toBeOnTheScreen();
  });

  it('o cartão mostra o nome, "Fatura aberta" e o valor da fatura (caso 4)', async () => {
    await render(<ContasScreen />);

    expect(await screen.findByText('Inter Gold')).toBeOnTheScreen();
    expect(screen.getByText('Fatura aberta')).toBeOnTheScreen();
    expect(screen.getByText('R$ 320,00')).toBeOnTheScreen();
  });

  it('saldo negativo aparece como "- R$ 50,00" (caso 5)', async () => {
    await render(<ContasScreen />);

    expect(await screen.findByText('- R$ 50,00')).toBeOnTheScreen();
  });

  it('sem contas, avisa "Nenhuma conta encontrada." (caso 6)', async () => {
    respostaDasContas = async () => respostaFalsa(200, []);

    await render(<ContasScreen />);

    expect(await screen.findByText('Nenhuma conta encontrada.')).toBeOnTheScreen();
  });

  it('com token recusado (401), avisa sobre o token e não oferece "Tentar de novo" (caso 7)', async () => {
    respostaDasContas = async () => respostaFalsa(401);

    await render(<ContasScreen />);

    expect(await screen.findByText(MENSAGEM_TOKEN)).toBeOnTheScreen();
    // Tentar de novo não adianta: o token errado continuaria errado.
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
  });

  it('puxar para baixo mostra o valor novo sem "Carregando as contas..." (caso 8)', async () => {
    await render(<ContasScreen />);
    await screen.findByText('R$ 1.234,56');

    // Prepara: o próximo pedido fica "segurado" até o teste liberar. Quando
    // chegar, o saldo da conta do Inter terá subido para 2.000,00.
    const saldoNovo: Conta = { ...INTER_CORRENTE, saldo: '2000.00' };
    const segurada = respostaSegurada(
      respostaFalsa(200, [saldoNovo, INTER_GOLD, NUBANK_CORRENTE]),
    );
    respostaDasContas = () => segurada.promessa;

    // Faz: puxa a tela e espera o app chegar ao segundo pedido.
    await puxarParaBaixo('rolagem-contas');
    await waitFor(() => expect(enderecosPedidos('/api/contas/')).toHaveLength(2));

    // Verifica: no meio da atualização, os dados de antes continuam e a tela
    // de carregamento não tomou o lugar deles.
    expect(screen.queryByText('Carregando as contas...')).toBeNull();
    expect(screen.getByText('R$ 1.234,56')).toBeOnTheScreen();

    // Faz: deixa a resposta chegar.
    await act(() => {
      segurada.liberar();
    });

    // Verifica: o saldo novo apareceu no lugar do antigo.
    expect(await screen.findByText('R$ 2.000,00')).toBeOnTheScreen();
    expect(screen.queryByText('R$ 1.234,56')).toBeNull();
  });
});
