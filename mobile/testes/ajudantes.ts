// Ajudantes usados pelos testes das telas Transações, Cartões e Contas
// (módulo 6). As três telas falam com o backend do mesmo jeito, então o
// servidor falso, as mensagens de erro e o "puxar para baixo" moram aqui, em
// vez de copiados em três arquivos.
//
// Este arquivo NÃO é um teste. Por padrão, o Jest roda como teste tudo o que
// está numa pasta __tests__ e todo arquivo terminado em .test.ts ou .spec.ts
// (o jest-expo não muda essa regra). Por isso ele fica em mobile/testes/, fora
// de __tests__, e com um nome comum: o Jest só o carrega quando um teste o
// importa.
//
// A tela Início (tela-inicio-test.tsx) tem as próprias cópias destas peças,
// com as explicações mais longas, porque nasceu antes deste arquivo. Se
// alguma ideia daqui parecer nova, a explicação detalhada está lá.
import { act, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { RefreshControlProps } from 'react-native';

// Textos que o usuário vê quando a API falha (iguais aos da tela Início).
export const MENSAGEM_CONEXAO =
  'Não foi possível conectar ao servidor. Confira se o backend está rodando e se o celular está na mesma rede.';
export const MENSAGEM_TOKEN = 'Acesso negado pelo servidor. Confira o token no arquivo .env do app.';
export const MENSAGEM_SERVIDOR = 'O servidor teve um erro. Tente de novo em instantes.';

// O aviso que aparece quando "puxar para baixo" não consegue atualizar.
export const AVISO_ATUALIZACAO = 'Não foi possível atualizar agora.';

// O endereço falso do backend. Os testes montam os endereços completos a
// partir dele, ex.: `${ENDERECO_BASE}/api/contas/`.
export const ENDERECO_BASE = 'http://servidor-falso:8000';

// ---------------------------------------------------------------------------
// O fetch falso (mock)
//
// Um mock (dublê) é uma função falsa que fica no lugar de uma de verdade: ela
// devolve a resposta que o teste escolhe e anota cada chamada. Aqui ela fica
// no lugar do fetch, para os testes nunca usarem a rede de verdade.
//
// Criamos o dublê uma vez só, aqui. Antes de cada teste, o mockReset (no
// prepararFetchFalso, abaixo) apaga as chamadas anotadas e as respostas
// combinadas no teste anterior, então cada teste começa do zero.
// ---------------------------------------------------------------------------
type ParametrosDoFetch = [input: RequestInfo | URL, init?: RequestInit];
export const fetchFalso = jest.fn<Promise<Response>, ParametrosDoFetch>();

// Monta uma resposta falsa do servidor só com os três campos que o app usa:
// ok, status e json() (a explicação do "as Response" está na tela Início).
export function respostaFalsa(status: number, dados?: unknown): Response {
  const parcial: Pick<Response, 'ok' | 'status' | 'json'> = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => dados,
  };
  return parcial as Response;
}

// Liga o fetch falso e o .env falso antes de cada teste e devolve tudo como
// era depois de cada um. Cada arquivo de teste chama esta função uma vez, lá
// em cima. Ela só registra o beforeEach e o afterEach (parecido com uma
// fixture do pytest com yield: antes do yield prepara, depois limpa).
export function prepararFetchFalso() {
  const fetchOriginal = globalThis.fetch;
  const urlOriginal = process.env.EXPO_PUBLIC_API_URL;
  const tokenOriginal = process.env.EXPO_PUBLIC_API_TOKEN;

  beforeEach(() => {
    fetchFalso.mockReset();
    globalThis.fetch = fetchFalso;
    // Endereço e token falsos, para não depender do .env de quem roda o teste.
    process.env.EXPO_PUBLIC_API_URL = ENDERECO_BASE;
    process.env.EXPO_PUBLIC_API_TOKEN = 'token-falso';
  });

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    // Se a variável não existia, apagamos (atribuir undefined viraria o
    // texto "undefined").
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
}

// Os endereços pedidos até agora que contêm um trecho, na ordem dos pedidos.
// Ex.: enderecosPedidos('/api/transacoes/') devolve
// ['http://servidor-falso:8000/api/transacoes/?mes=2026-10'].
// fetchFalso.mock.calls é a lista de chamadas anotadas pelo dublê; cada
// chamada é [endereço, opções], e aqui ficamos só com o endereço.
export function enderecosPedidos(trecho: string): string[] {
  return fetchFalso.mock.calls
    .map(([endereco]) => String(endereco))
    .filter((endereco) => endereco.includes(trecho));
}

// ---------------------------------------------------------------------------
// Uma resposta "segurada"
//
// Para olhar a tela NO MEIO de uma atualização, precisamos de uma resposta
// que só chega quando o teste mandar. respostaSegurada devolve duas coisas:
// - promessa: o que o servidor falso entrega ao app (fica "no caminho");
// - liberar: a função que faz a resposta finalmente chegar.
// A função de dentro do new Promise roda na hora, então o liberar já está
// pronto quando respostaSegurada termina.
// ---------------------------------------------------------------------------
export function respostaSegurada(resposta: Response) {
  let liberar: () => void = () => {};
  const promessa = new Promise<Response>((resolver) => {
    liberar = () => resolver(resposta);
  });
  return { promessa, liberar };
}

// ---------------------------------------------------------------------------
// Como o teste "puxa a tela para baixo"
//
// No celular, o gesto faz o RefreshControl chamar o onRefresh da tela. No
// Jest não há gesto, então achamos a área de rolagem pelo testID (ela não tem
// texto, papel nem rótulo), lemos o RefreshControl que está na propriedade
// refreshControl dela e chamamos o onRefresh dentro do act, que espera o
// React terminar de atualizar a tela. Vale para ScrollView e FlatList (a
// FlatList passa o testID e o refreshControl para o ScrollView de dentro).
// ---------------------------------------------------------------------------
export async function puxarParaBaixo(testID: string) {
  const rolagem = screen.getByTestId(testID);
  const controle = rolagem.props.refreshControl as ReactElement<RefreshControlProps>;
  await act(() => {
    controle.props.onRefresh?.();
  });
}
