// Testes da tela Transações (módulo 6): a lista de transações de um mês, com
// setas para ver os meses anteriores. A tela primeiro pede o resumo (só para
// saber qual é o mês do app, campo "mes") e depois pede as transações desse
// mês em GET /api/transacoes/?mes=AAAA-MM.
//
// As peças repetidas (fetch falso, respostas falsas, mensagens, puxar para
// baixo) estão em mobile/testes/ajudantes.ts.
//
// Módulo 8b: a categoria aparece em português, o ícone é escolhido pela
// categoria original (em inglês) e tocar numa transação abre a folha
// "Categoria", que lista GET /api/categorias/ e troca a categoria com
// PATCH /api/transacoes/<id>/. Esses testes estão no fim do arquivo.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Categoria, Resumo, Transacao } from '@/api';
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
//
// Desde o módulo 8b, cada transação tem dois campos de categoria:
// - categoria: o texto para mostrar (em português, quando o backend conhece
//   a tradução);
// - categoria_original: o nome em inglês, da Pluggy, que o app usa para
//   escolher o ícone e para marcar a categoria atual na folha.
// iFood, Salário e Loja X ficam com os dois campos em inglês (o caso "sem
// tradução conhecida" do plano), para os testes antigos continuarem vendo os
// mesmos textos. A tradução aparece no Pão de Açúcar, logo abaixo.
const IFOOD: Transacao = {
  id: 3,
  data: '2026-10-08',
  descricao: 'iFood',
  valor: '-45.90',
  conta: 2,
  nome_conta: 'Mastercard Black',
  nome_banco: 'Nubank',
  categoria: 'Food delivery',
  categoria_original: 'Food delivery',
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
  categoria_original: 'Salary',
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
  categoria_original: 'Shopping',
  parcela_atual: 3,
  total_parcelas: 10,
};

// Uma compra com tradução (módulo 8b): o backend manda "Mercado" para
// mostrar e "Groceries" como original. O id é 5 porque o teste do puxar para
// baixo já usa o 4 (Padaria).
const PAO_DE_ACUCAR: Transacao = {
  id: 5,
  data: '2026-10-10',
  descricao: 'Pão de Açúcar',
  valor: '-87.35',
  conta: 1,
  nome_conta: 'Conta Corrente',
  nome_banco: 'Inter',
  categoria: 'Mercado',
  categoria_original: 'Groceries',
  parcela_atual: null,
  total_parcelas: null,
};

// Da mais nova para a mais antiga, como o backend manda.
const TRANSACOES_DE_OUTUBRO = [PAO_DE_ACUCAR, IFOOD, SALARIO, LOJA_X];

// As categorias de GET /api/categorias/ (módulo 8b): "descricao" é o nome em
// inglês (o que o app manda no PATCH) e "nome" é o texto em português (o que
// aparece na folha). O backend já manda em ordem alfabética do nome.
const CATEGORIAS: Categoria[] = [
  { descricao: 'Groceries', nome: 'Mercado' },
  { descricao: 'Restaurants', nome: 'Restaurantes' },
  { descricao: 'Health', nome: 'Saúde' },
  { descricao: 'Transportation', nome: 'Transporte' },
];

// O iFood depois de trocar a categoria para Restaurantes: é o que o backend
// devolve no PATCH e, depois, na lista relida.
const IFOOD_EM_RESTAURANTES: Transacao = {
  ...IFOOD,
  categoria: 'Restaurantes',
  categoria_original: 'Restaurants',
};

// O endereço do PATCH do iFood (id 3).
const ENDERECO_PATCH_IFOOD = `${ENDERECO_BASE}/api/transacoes/3/`;

// O nome que o leitor de tela fala para cada item (o mesmo accessibilityLabel
// de antes do 8b). Desde o 8b, cada item é um botão, e é por esse nome que o
// teste acha o item para tocar nele, como alguém usando o TalkBack faria.
const ROTULO_IFOOD =
  'iFood, saída de 45,90 reais, 08/10, Nubank Mastercard Black, categoria Food delivery';
const ROTULO_PAO_DE_ACUCAR =
  'Pão de Açúcar, saída de 87,35 reais, 10/10, Inter Conta Corrente, categoria Mercado';

// ---------------------------------------------------------------------------
// O servidor falso desta tela
//
// Ele responde conforme o endereço pedido:
// - /api/resumo/ devolve o resumo de outubro;
// - /api/categorias/ devolve a lista CATEGORIAS (módulo 8b);
// - PATCH /api/transacoes/<id>/ chama respostaDoPatch (módulo 8b);
// - /api/transacoes/?mes=... chama respostaDasTransacoes com o mês pedido.
// Qualquer outro pedido (ex.: POST /api/sincronizar/) dá erro alto, para o
// teste mostrar claramente que a tela pediu algo que não devia.
//
// O PATCH vem antes do GET das transações porque os dois endereços contêm
// "/api/transacoes/"; só o método (opcoes?.method) separa um do outro. Sem
// método, o fetch faz GET.
//
// respostaDasTransacoes começa, em cada teste, devolvendo a lista acima para
// outubro e uma lista vazia para qualquer outro mês; respostaDoPatch começa
// devolvendo "deu certo" com o iFood em Restaurantes (veja o beforeEach). Um
// teste pode trocar qualquer uma no meio, para fingir que o backend mudou ou
// que recusou o pedido.
// ---------------------------------------------------------------------------
let respostaDasTransacoes: (mes: string) => Promise<Response>;
let respostaDoPatch: () => Promise<Response>;

function ligarServidorFalso() {
  fetchFalso.mockImplementation(async (endereco, opcoes) => {
    const url = String(endereco);
    if (url.includes('/api/resumo/')) {
      return respostaFalsa(200, RESUMO_DE_OUTUBRO);
    }
    if (url.includes('/api/categorias/')) {
      return respostaFalsa(200, CATEGORIAS);
    }
    if (url.includes('/api/transacoes/') && opcoes?.method === 'PATCH') {
      return respostaDoPatch();
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
  respostaDoPatch = async () => respostaFalsa(200, IFOOD_EM_RESTAURANTES);
  ligarServidorFalso();
});

// Lê as anotações do dublê (fetchFalso.mock.calls, cada chamada com
// [endereço, opções]) e fica só com os PATCH (módulo 8b).
function chamadasPatch() {
  return fetchFalso.mock.calls.filter(([, opcoes]) => opcoes?.method === 'PATCH');
}

// O corpo do primeiro PATCH, de volta de texto JSON para objeto. A tela manda
// JSON.stringify({...}); o JSON.parse desfaz isso, para comparar objetos com
// toEqual (mesma ideia do tela-inicio-test.tsx).
function corpoDoPatch(): unknown {
  const [, opcoes] = chamadasPatch()[0];
  return JSON.parse(String(opcoes?.body));
}

// Abre a tela, toca na transação com este nome (o accessibilityLabel) e
// espera a folha "Categoria" abrir com a lista já carregada. Quase todos os
// testes da folha começam assim, por isso a função.
//
// Esperamos pelo botão "Restaurantes" porque ele só aparece depois que o
// GET /api/categorias/ responde, e porque ele nunca é a categoria atual
// nestes testes (a atual pode ganhar o ícone de "check" junto do nome, e aí o
// nome do botão deixaria de ser só "Restaurantes").
async function abrirFolhaDe(rotulo: string) {
  await render(<TransacoesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: rotulo }));
  await screen.findByRole('header', { name: 'Categoria' });
  await screen.findByRole('button', { name: 'Restaurantes' });
}

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

// ---------------------------------------------------------------------------
// Módulo 8b: categorias em português e troca de categoria (casos 1 a 7)
//
// A folha "Categoria" é um Modal. No Jest, o Modal aberto mostra o conteúdo
// junto com a tela de trás (a lista continua desenhada); fechado, não
// desenha nada. Por isso, para saber se a folha fechou, conferimos que o
// título dela (o cabeçalho "Categoria") sumiu.
// ---------------------------------------------------------------------------
describe('Categoria em português (8b)', () => {
  it('mostra "Mercado" no item e escolhe o ícone pela categoria original "Groceries" (8b, caso 1)', async () => {
    await render(<TransacoesScreen />);

    // Verifica: o texto mostrado é a categoria em português.
    expect(await screen.findByText('Pão de Açúcar')).toBeOnTheScreen();
    expect(screen.getByText('Mercado')).toBeOnTheScreen();

    // Verifica: o ícone é o carrinho (shopping-cart), que o iconeDaCategoria
    // dá para "Groceries". Se a tela escolhesse pelo texto "Mercado", que não
    // está no mapa de categorias, o ícone seria os três pontinhos (ellipsis).
    // O dublê do Lucide (lá em cima) desenha um Text com o nome do ícone, e é
    // esse texto que procuramos. O círculo do ícone fica escondido do leitor
    // de tela, por isso o includeHiddenElements ("procure também nos
    // escondidos"), como no teste do ícone da tela Início.
    expect(screen.getByText('shopping-cart', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('Folha "Categoria" (8b)', () => {
  it('tocar numa transação abre "Categoria" com a descrição dela e a lista de GET /api/categorias/ (8b, caso 2)', async () => {
    await render(<TransacoesScreen />);

    // Faz: toca no item do iFood, achado pelo papel de botão e pelo nome que
    // o leitor de tela fala. Antes do 8b o item não era botão, e este passo
    // falharia.
    await fireEvent.press(await screen.findByRole('button', { name: ROTULO_IFOOD }));

    // Verifica: o título da folha é um cabeçalho.
    expect(await screen.findByRole('header', { name: 'Categoria' })).toBeOnTheScreen();

    // Verifica: a descrição da transação aparece na folha. Ela também está no
    // item da lista, atrás da folha, então agora "iFood" aparece duas vezes
    // (getAllByText devolve todos; antes de abrir a folha era um só). O
    // includeHiddenElements conta também o que estiver escondido do leitor
    // de tela: assim a conta dá 2 mesmo que a lista de trás fique escondida
    // enquanto a folha está aberta.
    expect(screen.getAllByText('iFood', { includeHiddenElements: true })).toHaveLength(2);

    // Verifica: as categorias que vieram do servidor viram botões com o nome
    // em português, e a primeira opção "Usar a categoria do banco" está lá.
    // findByRole espera a lista chegar.
    expect(await screen.findByRole('button', { name: 'Mercado' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Restaurantes' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Saúde' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Transporte' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Usar a categoria do banco' })).toBeOnTheScreen();

    // Verifica: a lista foi pedida uma vez, no endereço das categorias.
    expect(enderecosPedidos('/api/categorias/')).toEqual([`${ENDERECO_BASE}/api/categorias/`]);
  });

  it('a categoria atual da transação vem marcada como selecionada (8b, caso 2)', async () => {
    // Prepara: abre a folha do Pão de Açúcar, cuja categoria original é
    // "Groceries" (Mercado na lista).
    await abrirFolhaDe(ROTULO_PAO_DE_ACUCAR);

    // Verifica: getAllByRole com selected: true acha os botões que o leitor
    // de tela anuncia como "selecionado" (accessibilityState selected). Deve
    // haver um só, e com o texto "Mercado". Procuramos assim, e não pelo nome
    // exato "Mercado", porque o botão da atual também tem o ícone de check, e
    // o texto do dublê do ícone ("check") entra no nome do botão. O /Mercado/
    // é uma expressão regular: o texto do botão precisa conter "Mercado".
    const selecionados = screen.getAllByRole('button', { selected: true });
    expect(selecionados).toHaveLength(1);
    expect(selecionados[0]).toHaveTextContent(/Mercado/);

    // As outras categorias não estão selecionadas.
    expect(screen.getByRole('button', { name: 'Restaurantes' })).not.toBeSelected();
  });

  it('buscar "merc" deixa só "Mercado" (8b, caso 3)', async () => {
    // Prepara: abre a folha do iFood. A categoria dele ("Food delivery") não
    // está na lista, então nenhuma opção tem o check e os nomes dos botões
    // são exatamente os nomes das categorias.
    await abrirFolhaDe(ROTULO_IFOOD);

    // Faz: digita "merc" no campo de busca, achado pelo rótulo do leitor de
    // tela.
    await fireEvent.changeText(screen.getByLabelText('Buscar categoria'), 'merc');

    // Verifica: só o Mercado sobrou. queryByRole devolve null quando não acha.
    expect(screen.getByRole('button', { name: 'Mercado' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Restaurantes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Saúde' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Transporte' })).toBeNull();
  });

  it('buscar "saude", sem acento, acha "Saúde" (8b, caso 3)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    // Faz: digita sem acento, como muita gente digita no celular.
    await fireEvent.changeText(screen.getByLabelText('Buscar categoria'), 'saude');

    // Verifica: "Saúde" aparece mesmo assim, e o filtro tirou as outras.
    expect(screen.getByRole('button', { name: 'Saúde' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mercado' })).toBeNull();
  });

  it('buscar "xyz" mostra "Nenhuma categoria encontrada." (8b, caso 3)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    await fireEvent.changeText(screen.getByLabelText('Buscar categoria'), 'xyz');

    expect(screen.getByText('Nenhuma categoria encontrada.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mercado' })).toBeNull();
  });

  it('escolher "Restaurantes" manda PATCH /api/transacoes/3/ com categoria_manual "Restaurants" (8b, caso 4)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    // Faz: toca em Restaurantes.
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurantes' }));

    // Verifica: houve um PATCH (esperamos com waitFor, porque ele é
    // assíncrono)...
    await waitFor(() => expect(chamadasPatch()).toHaveLength(1));
    // ...no endereço do iFood, com o token e o aviso de que o corpo é JSON...
    const [endereco, opcoes] = chamadasPatch()[0];
    expect(endereco).toBe(ENDERECO_PATCH_IFOOD);
    expect(opcoes).toMatchObject({
      headers: { Authorization: 'Token token-falso', 'Content-Type': 'application/json' },
    });
    // ...e com o nome em inglês da categoria (a "descricao"), que é o que o
    // backend guarda; o português é só para mostrar.
    expect(corpoDoPatch()).toEqual({ categoria_manual: 'Restaurants' });
  });

  it('depois da troca, fecha a folha e relê o mesmo mês sem "Carregando as transações...", mostrando "Restaurantes" (8b, caso 4)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    // Prepara: o próximo GET das transações fica "segurado" até o teste
    // liberar (como no teste do puxar para baixo), para olharmos a tela no
    // meio da releitura. Quando chegar, traz o iFood já em Restaurantes.
    const segurada = respostaSegurada(
      respostaFalsa(200, [PAO_DE_ACUCAR, IFOOD_EM_RESTAURANTES, SALARIO, LOJA_X]),
    );
    respostaDasTransacoes = () => segurada.promessa;

    // Faz: escolhe Restaurantes.
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurantes' }));

    // Verifica: a lista foi pedida de novo, do mesmo mês. Filtramos por
    // "?mes=" porque o endereço do PATCH (/api/transacoes/3/) também contém
    // "/api/transacoes/" e não é uma releitura.
    await waitFor(() => expect(enderecosPedidos('/api/transacoes/?mes=')).toHaveLength(2));
    expect(enderecosPedidos('/api/transacoes/?mes=')).toEqual([
      ENDERECO_OUTUBRO,
      ENDERECO_OUTUBRO,
    ]);

    // Verifica: no meio da releitura, a lista de antes continua na tela (o
    // item do iFood, com o nome de antes), sem a tela de carregamento. Neste
    // momento a folha pode ainda estar aberta por cima (o contrato não diz se
    // ela fecha antes ou depois da releitura); o includeHiddenElements faz a
    // busca olhar também a tela de trás, mesmo que ela esteja escondida do
    // leitor de tela.
    expect(
      screen.queryByText('Carregando as transações...', { includeHiddenElements: true }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: ROTULO_IFOOD, includeHiddenElements: true }),
    ).toBeOnTheScreen();

    // Faz: deixa a resposta chegar (dentro do act, porque a tela muda).
    await act(() => {
      segurada.liberar();
    });

    // Verifica: a folha fechou (o título sumiu)...
    await waitFor(() => expect(screen.queryByRole('header', { name: 'Categoria' })).toBeNull());
    // ...e o item do iFood mostra a categoria nova. Com a folha fechada, o
    // único "Restaurantes" na tela é o do item.
    expect(await screen.findByText('Restaurantes')).toBeOnTheScreen();
  });

  it('"Usar a categoria do banco" manda categoria_manual vazio (8b, caso 5)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    await fireEvent.press(screen.getByRole('button', { name: 'Usar a categoria do banco' }));

    // Verifica: o texto vazio diz ao backend "apague a categoria manual e
    // volte a usar a que veio da Pluggy".
    await waitFor(() => expect(chamadasPatch()).toHaveLength(1));
    expect(corpoDoPatch()).toEqual({ categoria_manual: '' });
  });

  it('com 400 "Categoria desconhecida.", a folha continua aberta e mostra a mensagem (8b, caso 6)', async () => {
    // Prepara: o servidor recusa o PATCH com o formato de erro do DRF,
    // { campo: [mensagens] }.
    respostaDoPatch = async () =>
      respostaFalsa(400, { categoria_manual: ['Categoria desconhecida.'] });

    await abrirFolhaDe(ROTULO_IFOOD);

    // Faz: escolhe uma categoria qualquer; quem decide recusar é o servidor
    // falso.
    await fireEvent.press(screen.getByRole('button', { name: 'Saúde' }));

    // Verifica: a mensagem do backend aparece...
    expect(await screen.findByText('Categoria desconhecida.')).toBeOnTheScreen();
    // ...e a folha não fechou, para a pessoa escolher outra.
    expect(screen.getByRole('header', { name: 'Categoria' })).toBeOnTheScreen();
  });

  it('"Cancelar" fecha a folha sem nenhum PATCH (8b, caso 7)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    // Verifica: a folha fechou e nada foi mandado ao servidor.
    await waitFor(() => expect(screen.queryByRole('header', { name: 'Categoria' })).toBeNull());
    expect(chamadasPatch()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Módulo 11b: a opção fixa "Transferência entre minhas contas" (casos 1 a 4)
//
// A folha "Categoria" ganha, logo depois da busca, um atalho que marca a
// transação como transferência entre contas do próprio Vinicius. Ele manda o
// nome em inglês que a Pluggy usa, "Same person transfer", e o backend
// (11a) passa a não contar a transação como entrada nem saída.
//
// O botão tem o nome acessível exatamente "Transferência entre minhas
// contas" (accessibilityLabel). Como o accessibilityLabel substitui o texto
// de dentro do botão, o nome continua o mesmo mesmo quando a opção tem o
// ícone de "check"; por isso podemos achá-la pelo nome exato em todos os
// testes, inclusive no da opção selecionada.
// ---------------------------------------------------------------------------
const TRANSFERENCIA_PROPRIA = 'Transferência entre minhas contas';
const EXPLICACAO_TRANSFERENCIA = 'Não conta como entrada nem saída.';

// Uma transferência que a Pluggy já marcou como "mesma titularidade" (caso 3).
// Ela só entra na lista do teste que precisa dela (trocando a
// respostaDasTransacoes), para não mudar os testes de cima, que contam itens
// e pedidos.
const PIX_PARA_INTER: Transacao = {
  id: 6,
  data: '2026-10-12',
  descricao: 'PIX para Inter',
  valor: '-200.00',
  conta: 1,
  nome_conta: 'Conta Corrente',
  nome_banco: 'Nubank',
  categoria: 'Transferência mesma titularidade',
  categoria_original: 'Same person transfer - PIX',
  parcela_atual: null,
  total_parcelas: null,
};

const ROTULO_PIX_PARA_INTER =
  'PIX para Inter, saída de 200,00 reais, 12/10, Nubank Conta Corrente, categoria Transferência mesma titularidade';

describe('Transferência entre minhas contas (11b)', () => {
  it('a folha mostra "Transferência entre minhas contas" e "Não conta como entrada nem saída." (11b, caso 1)', async () => {
    // Prepara: abre a folha do iFood (categoria "Food delivery", que não é
    // transferência).
    await abrirFolhaDe(ROTULO_IFOOD);

    // Verifica: a opção é um botão com esse nome...
    expect(screen.getByRole('button', { name: TRANSFERENCIA_PROPRIA })).toBeOnTheScreen();
    // ...e a explicação aparece como texto, para a pessoa entender o efeito.
    expect(screen.getByText(EXPLICACAO_TRANSFERENCIA)).toBeOnTheScreen();
  });

  it('tocar na opção manda PATCH com categoria_manual "Same person transfer" (11b, caso 2)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    // Faz: toca no atalho.
    await fireEvent.press(screen.getByRole('button', { name: TRANSFERENCIA_PROPRIA }));

    // Verifica: um PATCH no endereço do iFood, com o nome em inglês que o
    // backend conhece (o mesmo da tabela de categorias da Pluggy).
    await waitFor(() => expect(chamadasPatch()).toHaveLength(1));
    const [endereco] = chamadasPatch()[0];
    expect(endereco).toBe(ENDERECO_PATCH_IFOOD);
    expect(corpoDoPatch()).toEqual({ categoria_manual: 'Same person transfer' });
  });

  it('depois de tocar na opção, a folha fecha e o mesmo mês é relido (11b, caso 2)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    await fireEvent.press(screen.getByRole('button', { name: TRANSFERENCIA_PROPRIA }));

    // Verifica: a folha fechou (o título sumiu)...
    await waitFor(() => expect(screen.queryByRole('header', { name: 'Categoria' })).toBeNull());
    // ...e a lista de outubro foi pedida de novo (ao abrir e depois da troca).
    // O filtro "?mes=" deixa o endereço do PATCH de fora.
    expect(enderecosPedidos('/api/transacoes/?mes=')).toEqual([
      ENDERECO_OUTUBRO,
      ENDERECO_OUTUBRO,
    ]);
  });

  it('numa transação com categoria original "Same person transfer - PIX", a opção vem selecionada (11b, caso 3)', async () => {
    // Prepara: a lista de outubro passa a ter também a transferência.
    respostaDasTransacoes = async (mes) =>
      respostaFalsa(200, mes === '2026-10' ? [PIX_PARA_INTER, ...TRANSACOES_DE_OUTUBRO] : []);

    // Faz: abre a folha da transferência.
    await abrirFolhaDe(ROTULO_PIX_PARA_INTER);

    // Verifica: o atalho está selecionado (o leitor de tela diz
    // "selecionado")...
    expect(screen.getByRole('button', { name: TRANSFERENCIA_PROPRIA })).toBeSelected();
    // ...e é o único selecionado: nenhuma categoria da lista ganhou a marca.
    expect(screen.getAllByRole('button', { selected: true })).toHaveLength(1);
  });

  it('buscar "merc" não esconde a opção "Transferência entre minhas contas" (11b, caso 4)', async () => {
    await abrirFolhaDe(ROTULO_IFOOD);

    // Faz: digita "merc" na busca, como no teste do 8b.
    await fireEvent.changeText(screen.getByLabelText('Buscar categoria'), 'merc');

    // Verifica: a busca funcionou (Restaurantes sumiu)...
    expect(screen.queryByRole('button', { name: 'Restaurantes' })).toBeNull();
    // ...mas o atalho do topo continua lá, porque ele não faz parte da lista
    // filtrada.
    expect(screen.getByRole('button', { name: TRANSFERENCIA_PROPRIA })).toBeOnTheScreen();
  });
});
