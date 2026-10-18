// Testes da tela Transações (módulo 6): a lista de transações de um mês, com
// setas para ver os meses anteriores. A tela primeiro pede o resumo (só para
// saber qual é o mês do app, campo "mes") e depois pede as transações desse
// mês em GET /api/transacoes/?mes=AAAA-MM.
//
// As peças repetidas (fetch falso, respostas falsas, mensagens, puxar para
// baixo) estão em mobile/testes/ajudantes.ts.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Resumo, Transacao } from '@/api';
import TransacoesScreen from '@/app/(abas)/transacoes';

import {
  AVISO_ATUALIZACAO,
  ENDERECO_BASE,
  MENSAGEM_CONEXAO,
  MENSAGEM_SERVIDOR,
  enderecosPedidos,
  fetchFalso,
  prepararFetchFalso,
  puxarParaBaixo,
  respostaFalsa,
  respostaSegurada,
} from '../testes/ajudantes';

// Dublê do pacote de ícones (explicado em tela-inicio-test.tsx). As setas e
// os ícones de categoria são Lucide; o falso é um Text simples com o nome do
// ícone, desenhado na hora. O jest.mock precisa ficar em cada arquivo de
// teste, porque o Jest o move para o topo deste arquivo.
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

const ENDERECO_OUTUBRO = `${ENDERECO_BASE}/api/transacoes/?mes=2026-10`;
const ENDERECO_SETEMBRO = `${ENDERECO_BASE}/api/transacoes/?mes=2026-09`;

// O resumo do backend. A tela só usa o campo "mes" (outubro de 2026); o
// resto existe porque o tipo Resumo exige todos os campos.
const RESUMO_DE_OUTUBRO: Resumo = {
  mes: '2026-10',
  saldo_total: '1250.50',
  fatura_aberta: '499.90',
  entradas: '3000.00',
  saidas: '1830.45',
  posso_gastar_por_dia: '31.31',
  dia_do_mes: 17,
  dias_no_mes: 31,
  limite_fatura: null,
  fatura_acima_do_limite: false,
  ultimos_gastos: [],
  guardado: {
    total: '0.00',
    este_mes: '0.00',
    plano: null,
    previsto: null,
    progresso: null,
    falta_guardar_no_mes: '0.00',
  },
  ultima_atualizacao: null,
};

// As transações de outubro, no formato do GET /api/transacoes/ (os mesmos
// campos dos "últimos gastos" do resumo). Os valores vêm como texto; saída é
// negativa e entrada é positiva.
const IFOOD: Transacao = {
  id: 3,
  data: '2026-10-08',
  descricao: 'iFood',
  valor: '-45.90',
  conta: 2,
  nome_conta: 'Mastercard Black',
  nome_banco: 'Nubank',
  categoria: 'Food delivery',
  parcela_atual: null,
  total_parcelas: null,
};

const SALARIO: Transacao = {
  id: 2,
  data: '2026-10-05',
  descricao: 'Salário',
  valor: '3000.00',
  conta: 1,
  nome_conta: 'Conta Corrente',
  nome_banco: 'Inter',
  categoria: 'Salary',
  parcela_atual: null,
  total_parcelas: null,
};

// Uma compra parcelada: esta é a parcela 3 de 10.
const LOJA_X: Transacao = {
  id: 1,
  data: '2026-10-02',
  descricao: 'Loja X',
  valor: '-120.00',
  conta: 2,
  nome_conta: 'Mastercard Black',
  nome_banco: 'Nubank',
  categoria: 'Shopping',
  parcela_atual: 3,
  total_parcelas: 10,
};

const TRANSACOES_DE_OUTUBRO = [IFOOD, SALARIO, LOJA_X];

// ---------------------------------------------------------------------------
// O servidor falso desta tela
//
// Ele responde conforme o endereço pedido:
// - /api/resumo/ devolve o resumo de outubro;
// - /api/transacoes/?mes=... chama respostaDasTransacoes com o mês pedido.
// Qualquer outro pedido (ex.: POST /api/sincronizar/) dá erro alto, para o
// teste mostrar claramente que a tela pediu algo que não devia.
//
// respostaDasTransacoes começa, em cada teste, devolvendo a lista acima para
// outubro e uma lista vazia para qualquer outro mês (veja o beforeEach). Um
// teste pode trocá-la no meio, para fingir que o backend mudou.
// ---------------------------------------------------------------------------
let respostaDasTransacoes: (mes: string) => Promise<Response>;

function ligarServidorFalso() {
  fetchFalso.mockImplementation(async (endereco, opcoes) => {
    const url = String(endereco);
    if (url.includes('/api/resumo/')) {
      return respostaFalsa(200, RESUMO_DE_OUTUBRO);
    }
    if (url.includes('/api/transacoes/')) {
      // O mês é o que vem depois de "mes=" no endereço:
      // ".../api/transacoes/?mes=2026-09".split('mes=') dá
      // [".../api/transacoes/?", "2026-09"], e o [1] é o "2026-09".
      const mes = url.split('mes=')[1];
      return respostaDasTransacoes(mes);
    }
    throw new Error(`Pedido inesperado no teste: ${opcoes?.method ?? 'GET'} ${url}`);
  });
}

beforeEach(() => {
  respostaDasTransacoes = async (mes) =>
    respostaFalsa(200, mes === '2026-10' ? TRANSACOES_DE_OUTUBRO : []);
  ligarServidorFalso();
});

describe('Tela Transações', () => {
  it('mostra "Carregando as transações..." enquanto a API não responde (caso 1)', async () => {
    // Relógio falso: a busca liga um timer de 15 s; com o relógio falso ele
    // nunca dispara de verdade (mesmo cuidado da tela Início).
    jest.useFakeTimers();

    // Prepara: um fetch que nunca termina. mockReturnValue troca a resposta
    // do servidor falso por esta, em todos os pedidos.
    fetchFalso.mockReturnValue(new Promise<Response>(() => {}));

    await render(<TransacoesScreen />);

    expect(screen.getByText('Carregando as transações...')).toBeOnTheScreen();
  });

  it('pede as transações do mês do resumo e mostra "Outubro de 2026" (caso 2)', async () => {
    await render(<TransacoesScreen />);

    // Verifica: o título do mês é um cabeçalho (papel "header"), como o
    // título da tela Início. findByRole espera ele aparecer.
    expect(await screen.findByRole('header', { name: 'Outubro de 2026' })).toBeOnTheScreen();

    // Verifica: as transações foram pedidas uma vez, no endereço com o mês
    // que veio do resumo. O mês vem do backend (e não do relógio do celular)
    // porque o mês do app pode começar dias antes do dia 1.
    expect(enderecosPedidos('/api/transacoes/')).toEqual([ENDERECO_OUTUBRO]);
  });

  it('a saída mostra descrição, valor, detalhes e categoria, e a parcelada mostra a parcela (caso 3)', async () => {
    await render(<TransacoesScreen />);

    // A saída (iFood): descrição, valor negativo, a linha "data · banco ·
    // conta" e a linha da categoria.
    expect(await screen.findByText('iFood')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 45,90')).toBeOnTheScreen();
    expect(screen.getByText('08/10 · Nubank · Mastercard Black')).toBeOnTheScreen();
    expect(screen.getByText('Food delivery')).toBeOnTheScreen();

    // A parcelada (Loja X): a linha da categoria ganha a parcela no fim.
    expect(screen.getByText('Shopping · Parcela 3 de 10')).toBeOnTheScreen();
  });

  it('a entrada mostra "+ R$ 3.000,00" e o leitor de tela lê "entrada de" (caso 4)', async () => {
    await render(<TransacoesScreen />);

    // A entrada tem o sinal de mais na frente.
    expect(await screen.findByText('+ R$ 3.000,00')).toBeOnTheScreen();

    // getByLabelText procura pelo texto que o leitor de tela fala. Ele junta
    // tudo do item numa frase, com o valor em reais (fica mais natural do
    // que ler "R$") e a palavra "entrada" no lugar do sinal.
    expect(
      screen.getByLabelText(
        'Salário, entrada de 3.000,00 reais, 05/10, Inter Conta Corrente, categoria Salary',
      ),
    ).toBeOnTheScreen();
  });

  it('"Mês anterior" pede setembro e mostra "Setembro de 2026" (caso 5)', async () => {
    await render(<TransacoesScreen />);
    await screen.findByText('iFood');

    // Faz: toca na seta para a esquerda, achada pelo papel de botão e pelo
    // nome que o leitor de tela fala.
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));

    // Verifica: o título mudou...
    expect(await screen.findByRole('header', { name: 'Setembro de 2026' })).toBeOnTheScreen();
    // ...e as transações de setembro foram pedidas, depois das de outubro.
    expect(enderecosPedidos('/api/transacoes/')).toEqual([ENDERECO_OUTUBRO, ENDERECO_SETEMBRO]);
  });

  it('setembro sem transações avisa "Nenhuma transação em Setembro de 2026." (caso 5)', async () => {
    // O servidor falso já devolve uma lista vazia para setembro.
    await render(<TransacoesScreen />);
    await screen.findByText('iFood');

    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));

    expect(await screen.findByText('Nenhuma transação em Setembro de 2026.')).toBeOnTheScreen();
    // As transações de outubro saíram da tela.
    expect(screen.queryByText('iFood')).toBeNull();
  });

  it('em outubro, "Próximo mês" está desativado e não faz pedido (caso 6)', async () => {
    await render(<TransacoesScreen />);
    await screen.findByText('iFood');

    // Verifica: o botão existe, mas está desativado. O toBeDisabled olha o
    // estado que o leitor de tela anuncia (accessibilityState disabled), o
    // mesmo que faz o TalkBack dizer "desativado". Meses futuros ficam para
    // o Módulo 7.
    const proximo = screen.getByRole('button', { name: 'Próximo mês' });
    expect(proximo).toBeDisabled();

    // Faz: toca mesmo assim.
    await fireEvent.press(proximo);

    // Verifica: nenhum pedido novo (só o de outubro, ao abrir) e o título
    // continua em outubro.
    expect(enderecosPedidos('/api/transacoes/')).toEqual([ENDERECO_OUTUBRO]);
    expect(screen.getByRole('header', { name: 'Outubro de 2026' })).toBeOnTheScreen();
  });

  it('em setembro, "Próximo mês" pede outubro de novo (caso 6)', async () => {
    await render(<TransacoesScreen />);
    await screen.findByText('iFood');

    // Prepara: volta para setembro e espera a tela chegar lá.
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    await screen.findByRole('header', { name: 'Setembro de 2026' });

    // Faz: avança um mês.
    await fireEvent.press(screen.getByRole('button', { name: 'Próximo mês' }));

    // Verifica: o título voltou para outubro e outubro foi pedido de novo
    // (a ordem: outubro ao abrir, setembro, outubro).
    expect(await screen.findByRole('header', { name: 'Outubro de 2026' })).toBeOnTheScreen();
    expect(enderecosPedidos('/api/transacoes/')).toEqual([
      ENDERECO_OUTUBRO,
      ENDERECO_SETEMBRO,
      ENDERECO_OUTUBRO,
    ]);
  });

  it('com erro de conexão na lista, mantém título e setas, e "Tentar de novo" refaz o mesmo mês (caso 7)', async () => {
    // Prepara: o resumo responde, mas o pedido das transações falha como se
    // não houvesse rede (o fetch de verdade dá TypeError nesse caso).
    respostaDasTransacoes = async () => {
      throw new TypeError('Network request failed');
    };

    await render(<TransacoesScreen />);

    // Verifica: a mensagem de conexão e o botão aparecem na área da lista...
    expect(await screen.findByText(MENSAGEM_CONEXAO)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    // ...e o cabeçalho continua: o título do mês e as duas setas.
    expect(screen.getByRole('header', { name: 'Outubro de 2026' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeOnTheScreen();

    // Prepara: a rede "volta"; agora o servidor falso devolve a lista.
    respostaDasTransacoes = async () => respostaFalsa(200, TRANSACOES_DE_OUTUBRO);

    // Faz: toca em "Tentar de novo".
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    // Verifica: a lista apareceu e o pedido repetido foi do mesmo mês.
    expect(await screen.findByText('iFood')).toBeOnTheScreen();
    expect(enderecosPedidos('/api/transacoes/')).toEqual([ENDERECO_OUTUBRO, ENDERECO_OUTUBRO]);
  });

  it('puxar para baixo relê o mesmo mês sem mostrar "Carregando as transações..." (caso 8)', async () => {
    await render(<TransacoesScreen />);
    await screen.findByText('iFood');

    // Prepara: o próximo pedido das transações fica "segurado" até o teste
    // liberar, para olharmos a tela no meio da atualização. Quando chegar,
    // traz uma transação nova (Padaria) no topo.
    const PADARIA: Transacao = { ...IFOOD, id: 4, descricao: 'Padaria', valor: '-12.00' };
    const segurada = respostaSegurada(
      respostaFalsa(200, [PADARIA, ...TRANSACOES_DE_OUTUBRO]),
    );
    respostaDasTransacoes = () => segurada.promessa;

    // Faz: puxa a lista para baixo e espera o app chegar ao segundo pedido.
    await puxarParaBaixo('rolagem-transacoes');
    await waitFor(() => expect(enderecosPedidos('/api/transacoes/')).toHaveLength(2));

    // Verifica: o segundo pedido foi do mesmo mês...
    expect(enderecosPedidos('/api/transacoes/')).toEqual([ENDERECO_OUTUBRO, ENDERECO_OUTUBRO]);
    // ...e, no meio da atualização, a lista de antes continua na tela, sem
    // a tela de carregamento no lugar dela.
    expect(screen.queryByText('Carregando as transações...')).toBeNull();
    expect(screen.getByText('iFood')).toBeOnTheScreen();

    // Faz: deixa a resposta chegar (dentro do act, porque a tela muda).
    await act(() => {
      segurada.liberar();
    });

    // Verifica: a transação nova apareceu. E puxar para baixo nesta tela não
    // sincroniza com a Pluggy (isso continua só no Início).
    expect(await screen.findByText('Padaria')).toBeOnTheScreen();
    expect(enderecosPedidos('/api/sincronizar/')).toHaveLength(0);
  });

  it('se puxar para baixo falha, a lista fica e aparece "Não foi possível atualizar agora." (caso 8)', async () => {
    await render(<TransacoesScreen />);
    await screen.findByText('iFood');

    // Prepara: a partir de agora, o servidor responde 500 às transações.
    respostaDasTransacoes = async () => respostaFalsa(500);

    await puxarParaBaixo('rolagem-transacoes');

    // Verifica: o aviso aparece...
    expect(await screen.findByText(AVISO_ATUALIZACAO)).toBeOnTheScreen();
    // ...e a lista de antes continua, sem a mensagem de erro de tela inteira.
    expect(screen.getByText('iFood')).toBeOnTheScreen();
    expect(screen.queryByText(MENSAGEM_SERVIDOR)).toBeNull();
  });
});
