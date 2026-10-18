// Testes da tela Relatório (módulo 9b): o relatório de um mês, com os números
// do mês (Entrou, Saiu, Saldo do mês), os gastos por categoria e os maiores
// gastos. A tela abre por cima das abas, a partir do botão "Ver relatório do
// mês" da tela Início (esse caminho é testado em rotas-test.tsx, caso 1 do 9b).
//
// Fluxo da tela (contrato em docs/planos/modulo-9-relatorio.md, seção "9b:
// contrato da tela"):
// 1. ao abrir, pede GET /api/relatorio/ SEM "?mes=": o backend responde com o
//    mês atual do app (campo "mes"), já com os "dias antes" aplicados;
// 2. as setas trocam o mês e pedem GET /api/relatorio/?mes=AAAA-MM.
// Diferente da tela Transações, aqui não há pedido do resumo: o próprio
// relatório já diz qual é o mês.
//
// Aqui a tela é desenhada direto (render), sem o Router, como nos testes das
// outras telas. As peças repetidas (fetch falso, respostas falsas, mensagens,
// puxar para baixo) estão em mobile/testes/ajudantes.ts.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Relatorio, Transacao } from '@/api';
import RelatorioScreen from '@/app/relatorio';

import {
  ENDERECO_BASE,
  MENSAGEM_CONEXAO,
  enderecosPedidos,
  fetchFalso,
  prepararFetchFalso,
  puxarParaBaixo,
  respostaFalsa,
  respostaSegurada,
} from '../testes/ajudantes';

// Dublê do pacote de ícones (explicado em tela-inicio-test.tsx). O botão
// "Voltar", as setas de mês e os ícones das categorias são Lucide; o falso é
// um Text simples com o nome do ícone, desenhado na hora. O jest.mock precisa
// ficar em cada arquivo de teste, porque o Jest o move para o topo do arquivo.
jest.mock('@react-native-vector-icons/lucide', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  function IconeFalso({ name, ...resto }: { name: string }) {
    return React.createElement(Text, resto, name);
  }
  return { __esModule: true, default: IconeFalso, Lucide: IconeFalso };
});

// Liga o fetch falso e o .env falso antes de cada teste (e limpa depois).
// O fetch falso é um mock (dublê): uma função no lugar do fetch de verdade,
// que devolve o que o teste escolher e anota cada pedido. Assim nenhum teste
// usa a rede, e o resultado não depende do backend estar ligado.
prepararFetchFalso();

// Os três endereços que a tela pode pedir nestes testes.
const ENDERECO_RELATORIO = `${ENDERECO_BASE}/api/relatorio/`;
const ENDERECO_OUTUBRO = `${ENDERECO_BASE}/api/relatorio/?mes=2026-10`;
const ENDERECO_SETEMBRO = `${ENDERECO_BASE}/api/relatorio/?mes=2026-09`;

// A frase que explica por que o total de gastos pode ser diferente do "Saiu"
// da tela Início (o relatório conta as compras do cartão).
const FRASE_DA_DIFERENCA = 'Inclui as compras do cartão; por isso pode ser diferente do Saiu.';

// ---------------------------------------------------------------------------
// Os maiores gastos de outubro
//
// Mesmo formato das transações de GET /api/transacoes/ (o backend usa o mesmo
// TransacaoSerializer): valor como texto, negativo na saída; "categoria" em
// português (para mostrar) e "categoria_original" em inglês (para o ícone).
// Os dados imitam os reais: os maiores gastos da conta corrente são PIX e
// transferências para outras pessoas.
// ---------------------------------------------------------------------------
const PIX_MARIA: Transacao = {
  id: 41,
  data: '2026-10-14',
  descricao: 'Pix enviado - Maria Souza',
  valor: '-650.00',
  conta: 1,
  nome_conta: 'Conta Corrente',
  nome_banco: 'Inter',
  categoria: 'Transferência - PIX',
  categoria_original: 'Transfer - PIX',
  parcela_atual: null,
  total_parcelas: null,
};

const TRANSFERENCIA_JOAO: Transacao = {
  id: 37,
  data: '2026-10-09',
  descricao: 'Transferência enviada - João Lima',
  valor: '-420.00',
  conta: 1,
  nome_conta: 'Conta Corrente',
  nome_banco: 'Inter',
  categoria: 'Transferências',
  categoria_original: 'Transfers',
  parcela_atual: null,
  total_parcelas: null,
};

const CLARO_INTERNET: Transacao = {
  id: 29,
  data: '2026-10-05',
  descricao: 'Claro Internet',
  valor: '-129.90',
  conta: 2,
  nome_conta: 'Mastercard Black',
  nome_banco: 'Nubank',
  categoria: 'Serviços',
  categoria_original: 'Services',
  parcela_atual: null,
  total_parcelas: null,
};

// ---------------------------------------------------------------------------
// O relatório de outubro, no formato do GET /api/relatorio/
//
// - entradas, saidas e saldo_do_mes: os mesmos números do resumo (a saída
//   vem positiva, como no resumo; a tela põe o "- " na frente);
// - total_gastos: o que foi consumido no mês, com as compras do cartão;
// - gastos_por_categoria: do maior para o menor, com a porcentagem inteira;
// - maiores_gastos: até 5 transações, da maior para a menor.
// ---------------------------------------------------------------------------
const RELATORIO_DE_OUTUBRO: Relatorio = {
  mes: '2026-10',
  entradas: '3205.10',
  saidas: '2812.06',
  saldo_do_mes: '393.04',
  total_gastos: '2849.58',
  gastos_por_categoria: [
    {
      categoria: 'Transferência - PIX',
      categoria_original: 'Transfer - PIX',
      total: '1079.17',
      porcentagem: 37,
    },
    {
      categoria: 'Transferências',
      categoria_original: 'Transfers',
      total: '768.50',
      porcentagem: 26,
    },
    {
      categoria: 'Serviços',
      categoria_original: 'Services',
      total: '300.49',
      porcentagem: 10,
    },
  ],
  maiores_gastos: [PIX_MARIA, TRANSFERENCIA_JOAO, CLARO_INTERNET],
};

// O relatório de setembro, para o teste da seta "Mês anterior". Os números
// são outros, para mostrar que a tela trocou de mês de verdade.
const RELATORIO_DE_SETEMBRO: Relatorio = {
  mes: '2026-09',
  entradas: '3100.00',
  saidas: '2950.40',
  saldo_do_mes: '149.60',
  total_gastos: '2700.00',
  gastos_por_categoria: [
    {
      categoria: 'Transferências',
      categoria_original: 'Transfers',
      total: '2700.00',
      porcentagem: 100,
    },
  ],
  maiores_gastos: [{ ...TRANSFERENCIA_JOAO, id: 12, data: '2026-09-10' }],
};

// ---------------------------------------------------------------------------
// O servidor falso desta tela
//
// Responde só GET /api/relatorio/. O mês pedido é o que vem depois de
// "mes=" no endereço; sem "?mes=", o mês fica undefined (o primeiro pedido da
// tela). respostaDoRelatorio recebe esse mês e escolhe a resposta.
//
// Qualquer outro pedido (o resumo, a sincronização...) dá erro alto, para o
// teste mostrar claramente que a tela pediu algo que não devia: pelo
// contrato, o relatório não precisa do resumo para saber o mês.
//
// Em cada teste, respostaDoRelatorio começa devolvendo outubro para o
// primeiro pedido (sem mês) e para "2026-10", setembro para "2026-09" (veja o
// beforeEach). Um teste pode trocar a função no meio, para fingir que o
// backend mudou, falhou ou está demorando.
// ---------------------------------------------------------------------------
let respostaDoRelatorio: (mes: string | undefined) => Promise<Response>;

beforeEach(() => {
  respostaDoRelatorio = async (mes) =>
    respostaFalsa(200, mes === '2026-09' ? RELATORIO_DE_SETEMBRO : RELATORIO_DE_OUTUBRO);

  fetchFalso.mockImplementation(async (endereco, opcoes) => {
    const url = String(endereco);
    if (url.includes('/api/relatorio/')) {
      // ".../api/relatorio/?mes=2026-09".split('mes=') dá
      // [".../api/relatorio/?", "2026-09"], e o [1] é o "2026-09".
      const mes = url.includes('mes=') ? url.split('mes=')[1] : undefined;
      return respostaDoRelatorio(mes);
    }
    throw new Error(`Pedido inesperado no teste: ${opcoes?.method ?? 'GET'} ${url}`);
  });
});

describe('Tela Relatório', () => {
  it('pede GET /api/relatorio/ sem "?mes=" e mostra outubro com Entrou, Saiu e Saldo do mês (caso 2)', async () => {
    // Prepara e faz: desenha a tela. O servidor falso responde outubro.
    await render(<RelatorioScreen />);

    // Verifica: o título do mês é um cabeçalho (papel "header"), como na tela
    // Transações. findByRole espera ele aparecer (os dados chegam depois).
    expect(await screen.findByRole('header', { name: 'Outubro de 2026' })).toBeOnTheScreen();

    // Verifica: os três cartões, com o sinal na frente (a cor nunca é a
    // única pista de entrada ou saída).
    expect(screen.getByText('+ R$ 3.205,10')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 2.812,06')).toBeOnTheScreen();
    expect(screen.getByText('+ R$ 393,04')).toBeOnTheScreen();

    // Verifica: houve um pedido só, no endereço SEM "?mes=". É o backend que
    // sabe o mês atual do app (ele pode começar dias antes do dia 1), então
    // a tela não calcula o mês pelo relógio do celular.
    expect(enderecosPedidos('/api/relatorio/')).toEqual([ENDERECO_RELATORIO]);
  });

  it('com saldo do mês negativo, mostra "- R$ 290,00" (caso 3)', async () => {
    // Prepara: um mês em que saiu mais do que entrou. O "..." copia o
    // relatório de outubro e os campos escritos depois substituem os dele.
    respostaDoRelatorio = async () =>
      respostaFalsa(200, {
        ...RELATORIO_DE_OUTUBRO,
        entradas: '2522.06',
        saidas: '2812.06',
        saldo_do_mes: '-290.00',
      });

    await render(<RelatorioScreen />);

    // Verifica: o saldo aparece com "- " (e não "+ - R$ 290,00"). O getByText
    // compara o texto inteiro, então um "+" sobrando faria o teste falhar.
    expect(await screen.findByText('- R$ 290,00')).toBeOnTheScreen();
  });

  it('as categorias aparecem na ordem da API, com valor, porcentagem, rótulo e barra (caso 4)', async () => {
    await render(<RelatorioScreen />);
    await screen.findByRole('header', { name: 'Gastos por categoria' });

    // Verifica: cada linha tem um rótulo para o leitor de tela, que junta
    // nome, valor em reais e porcentagem numa frase só. getAllByLabelText
    // devolve as linhas na ordem da tela (de cima para baixo). A expressão
    // regular /reais, \d+ por cento$/ pega só rótulos que terminam assim
    // ("\d+" é "um ou mais dígitos"), ou seja, só as linhas das categorias.
    const linhas = screen.getAllByLabelText(/reais, \d+ por cento$/);
    expect(linhas).toHaveLength(3);
    // toHaveAccessibleName confere o nome que o leitor de tela fala.
    expect(linhas[0]).toHaveAccessibleName('Transferência - PIX: 1.079,17 reais, 37 por cento');
    expect(linhas[1]).toHaveAccessibleName('Transferências: 768,50 reais, 26 por cento');
    expect(linhas[2]).toHaveAccessibleName('Serviços: 300,49 reais, 10 por cento');

    // Verifica: o valor e a porcentagem que a pessoa vê na primeira linha.
    // (O nome da categoria não é conferido por texto aqui porque ele também
    // aparece na linha de categoria dos maiores gastos.)
    expect(screen.getByText('R$ 1.079,17')).toBeOnTheScreen();
    expect(screen.getByText('37%')).toBeOnTheScreen();

    // Verifica: a barra. Ela não tem texto, então procuramos pelo papel
    // "progressbar" (o leitor de tela anuncia "barra de progresso"). Há uma
    // por categoria, na mesma ordem; a primeira está em 37 de 100.
    const barras = screen.getAllByRole('progressbar');
    expect(barras).toHaveLength(3);
    expect(barras[0]).toHaveAccessibilityValue({ min: 0, max: 100, now: 37 });
  });

  it('mostra "Total de gastos: R$ 2.849,58" e a frase da diferença com o Saiu (caso 5)', async () => {
    await render(<RelatorioScreen />);

    // Verifica: o total de gastos (com as compras do cartão)...
    expect(await screen.findByText('Total de gastos: R$ 2.849,58')).toBeOnTheScreen();
    // ...e a frase que explica por que ele não é igual ao "Saiu" (2.812,06).
    expect(screen.getByText(FRASE_DA_DIFERENCA)).toBeOnTheScreen();
  });

  it('"Maiores gastos" lista as descrições e os valores, e os itens não são botões (caso 6)', async () => {
    await render(<RelatorioScreen />);

    // Verifica: o título da seção é um cabeçalho.
    expect(await screen.findByRole('header', { name: 'Maiores gastos' })).toBeOnTheScreen();

    // Verifica: cada gasto aparece com a descrição e o valor (saída com "- ").
    expect(screen.getByText('Pix enviado - Maria Souza')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 650,00')).toBeOnTheScreen();
    expect(screen.getByText('Transferência enviada - João Lima')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 420,00')).toBeOnTheScreen();
    expect(screen.getByText('Claro Internet')).toBeOnTheScreen();
    expect(screen.getByText('- R$ 129,90')).toBeOnTheScreen();

    // Verifica: nenhum item é botão. Na tela Transações, tocar no item abre a
    // folha de categoria; aqui o item é só para ler. queryByRole devolve null
    // quando não acha. A expressão regular /Pix enviado/ pega qualquer nome
    // de botão que contenha esse trecho, seja qual for o resto do rótulo.
    expect(screen.queryByRole('button', { name: /Pix enviado/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Transferência enviada/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Claro Internet/ })).toBeNull();
  });

  it('"Mês anterior" pede "?mes=2026-09" e mostra "Setembro de 2026" (caso 7)', async () => {
    await render(<RelatorioScreen />);
    await screen.findByRole('header', { name: 'Outubro de 2026' });

    // Faz: toca na seta para a esquerda, achada pelo papel de botão e pelo
    // nome que o leitor de tela fala. Na Testing Library 14 o fireEvent.press
    // é assíncrono, por isso o await.
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));

    // Verifica: o título mudou e os números de setembro apareceram...
    expect(await screen.findByRole('header', { name: 'Setembro de 2026' })).toBeOnTheScreen();
    expect(await screen.findByText('+ R$ 3.100,00')).toBeOnTheScreen();
    // ...e o segundo pedido levou o mês: o mês anterior ao que veio na
    // primeira resposta ("2026-10").
    expect(enderecosPedidos('/api/relatorio/')).toEqual([ENDERECO_RELATORIO, ENDERECO_SETEMBRO]);
  });

  it('no mês atual, "Próximo mês" está desativado (caso 7)', async () => {
    await render(<RelatorioScreen />);
    await screen.findByRole('header', { name: 'Outubro de 2026' });

    // Verifica: o botão existe, mas está desativado. O toBeDisabled olha o
    // estado que o leitor de tela anuncia (accessibilityState disabled).
    // Meses futuros não têm relatório.
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
  });

  it('mês sem gastos mostra "Nenhum gasto neste mês." e nenhuma das duas seções (caso 8)', async () => {
    // Prepara: um mês com entradas e saídas, mas sem nenhum gasto (as listas
    // vêm vazias e o total, "0.00", como o backend manda).
    respostaDoRelatorio = async () =>
      respostaFalsa(200, {
        ...RELATORIO_DE_OUTUBRO,
        total_gastos: '0.00',
        gastos_por_categoria: [],
        maiores_gastos: [],
      });

    await render(<RelatorioScreen />);

    // Verifica: o aviso aparece...
    expect(await screen.findByText('Nenhum gasto neste mês.')).toBeOnTheScreen();
    // ...no lugar das duas seções (queryByRole devolve null quando não acha)...
    expect(screen.queryByRole('header', { name: 'Gastos por categoria' })).toBeNull();
    expect(screen.queryByRole('header', { name: 'Maiores gastos' })).toBeNull();
    // ...e os cartões do mês continuam na tela.
    expect(screen.getByText('+ R$ 3.205,10')).toBeOnTheScreen();
  });

  it('com erro de conexão, mostra a mensagem e "Tentar de novo" pede de novo e mostra o relatório (caso 9)', async () => {
    // Prepara: o pedido falha como se não houvesse rede (o fetch de verdade
    // dá TypeError nesse caso).
    respostaDoRelatorio = async () => {
      throw new TypeError('Network request failed');
    };

    await render(<RelatorioScreen />);

    // Verifica: a mensagem de conexão e o botão aparecem.
    expect(await screen.findByText(MENSAGEM_CONEXAO)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();

    // Prepara: a rede "volta"; agora o servidor falso devolve outubro.
    respostaDoRelatorio = async () => respostaFalsa(200, RELATORIO_DE_OUTUBRO);

    // Faz: toca em "Tentar de novo".
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    // Verifica: o relatório apareceu e houve um segundo pedido. Os dois vão
    // sem "?mes=": como o primeiro falhou, a tela ainda não sabe o mês.
    expect(await screen.findByText('+ R$ 3.205,10')).toBeOnTheScreen();
    expect(enderecosPedidos('/api/relatorio/')).toEqual([ENDERECO_RELATORIO, ENDERECO_RELATORIO]);
  });

  it('puxar para baixo relê o mesmo mês sem mostrar "Carregando o relatório..." (caso 10)', async () => {
    await render(<RelatorioScreen />);
    await screen.findByText('+ R$ 3.205,10');

    // Prepara: o próximo pedido fica "segurado" até o teste liberar, para
    // olharmos a tela no meio da atualização. Quando chegar, traz entradas
    // novas (3.405,10), como se tivesse caído um dinheiro.
    const segurada = respostaSegurada(
      respostaFalsa(200, { ...RELATORIO_DE_OUTUBRO, entradas: '3405.10', saldo_do_mes: '593.04' }),
    );
    respostaDoRelatorio = () => segurada.promessa;

    // Faz: puxa a tela para baixo (a área de rolagem é achada pelo testID
    // "rolagem-relatorio", combinado no contrato) e espera o segundo pedido.
    await puxarParaBaixo('rolagem-relatorio');
    await waitFor(() => expect(enderecosPedidos('/api/relatorio/')).toHaveLength(2));

    // Verifica: o segundo pedido é do mesmo mês, outubro. O contrato não diz
    // se a releitura vai sem "?mes=" ou com "?mes=2026-10" (as duas dão
    // outubro), então aceitamos os dois: toContain confere se o endereço
    // pedido está na lista.
    const segundoPedido = enderecosPedidos('/api/relatorio/')[1];
    expect([ENDERECO_RELATORIO, ENDERECO_OUTUBRO]).toContain(segundoPedido);

    // Verifica: no meio da atualização, os números de antes continuam na
    // tela, sem a tela de carregamento no lugar deles.
    expect(screen.queryByText('Carregando o relatório...')).toBeNull();
    expect(screen.getByText('+ R$ 3.205,10')).toBeOnTheScreen();

    // Faz: deixa a resposta chegar (dentro do act, porque a tela muda).
    await act(() => {
      segurada.liberar();
    });

    // Verifica: os números novos apareceram.
    expect(await screen.findByText('+ R$ 3.405,10')).toBeOnTheScreen();
  });
});
