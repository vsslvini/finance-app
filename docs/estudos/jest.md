# Jest no projeto

Guia de estudo do que o app mobile usa do Jest, do `jest-expo` e da React Native Testing
Library. Os exemplos vêm dos nossos testes (`mobile/__tests__/`). Links conferidos em
2026-10-10. É o "irmão" do [`pytest.md`](pytest.md): se você já estudou o pytest, muita
coisa aqui é a mesma ideia com outro nome.

Versões (ver `mobile/package.json`): jest 29.7, jest-expo 57.0.5, @testing-library/react-native
14.1.0, test-renderer 1.2.0.

- [Jest no projeto](#jest-no-projeto)
  - [1. Quem é quem](#1-quem-é-quem)
  - [2. Como o Jest acha os testes](#2-como-o-jest-acha-os-testes)
  - [3. `describe`, `it` e `expect`](#3-describe-it-e-expect)
  - [4. `render` e `screen`: desenhar a tela sem celular](#4-render-e-screen-desenhar-a-tela-sem-celular)
  - [5. `async` e `await` nos testes](#5-async-e-await-nos-testes)
  - [6. Testar rotas: `renderRouter`](#6-testar-rotas-renderrouter)
  - [7. TypeScript nos testes](#7-typescript-nos-testes)
  - [8. Comandos que usamos](#8-comandos-que-usamos)
  - [9. Comparando com o pytest](#9-comparando-com-o-pytest)
  - [10. Mocks: trocar o `fetch` por um dublê](#10-mocks-trocar-o-fetch-por-um-dublê)
  - [11. `beforeEach` e `afterEach`](#11-beforeeach-e-aftereach)
  - [12. Esperar e procurar: `findBy`, `getBy` e `queryBy`](#12-esperar-e-procurar-findby-getby-e-queryby)
  - [13. Tocar num botão: `fireEvent.press`](#13-tocar-num-botão-fireeventpress)
  - [14. Relógio falso (fake timers)](#14-relógio-falso-fake-timers)
  - [15. Um dublê que responde por endereço](#15-um-dublê-que-responde-por-endereço)
  - [16. Trocar um pacote inteiro: `jest.mock`](#16-trocar-um-pacote-inteiro-jestmock)
  - [17. Digitar, elementos escondidos e propriedades](#17-digitar-elementos-escondidos-e-propriedades)

## 1. Quem é quem

São quatro peças, cada uma com um papel:

| Peça | Papel | Parecido com, no backend |
|---|---|---|
| **Jest** | o executor: acha os arquivos de teste, roda e mostra o resultado | pytest |
| **jest-expo** | um "preset" (configuração pronta) que ensina o Jest a entender um projeto Expo: TypeScript, JSX, módulos nativos falsos | pytest-django (que ensina o pytest a entender o Django) |
| **React Native Testing Library** (`@testing-library/react-native`) | desenha a tela sem celular e procura coisas nela como um usuário faria | o `APIClient` do DRF (que faz pedidos sem servidor) |
| **test-renderer** | o motor que a Testing Library usa por baixo para desenhar; não usamos direto | (nada parecido) |

Por que o `test-renderer` está fixado em 1.2.0: a versão mais nova (1.3.0) exige React 19.3, e
o Expo 57 usa React 19.2.3. Sem fixar, o npm instalava a 1.3.0 sozinho (ver
`modulos/base-mobile.md`, seção 3).

## 2. Como o Jest acha os testes

Fonte: https://docs.expo.dev/develop/unit-testing/ (conferido em 2026-10-10).

A configuração fica no `mobile/package.json`:

```json
"scripts": { "test": "jest" },
"jest": { "preset": "jest-expo" }
```

- `"test": "jest"` faz o `npm test` chamar o Jest.
- `"preset": "jest-expo"` carrega a configuração pronta do Expo.

O Jest procura arquivos dentro de pastas `__tests__` (e também arquivos terminados em `-test.tsx`
ou `.test.tsx`). Os nossos ficam em `mobile/__tests__/`.

**Regra importante:** nunca coloque teste dentro de `mobile/src/app/`. Com o Expo Router, todo
arquivo nessa pasta vira uma tela do app (ver `modulos/base-mobile.md`, seção 2). Um teste ali
viraria uma "tela" quebrada.

## 3. `describe`, `it` e `expect`

Fonte: https://jestjs.io/docs/api (conferido em 2026-10-10).

```tsx
describe('Tela inicial', () => {
  it('abre mostrando o texto "Início"', async () => {
    // ...
    expect(screen.getByText('Início')).toBeOnTheScreen();
  });
});
```

- **`describe('nome', () => {...})`**: agrupa testes parecidos sob um nome. É só organização; no
  resultado aparece "Tela inicial > abre mostrando o texto...". No pytest, o equivalente seria
  juntar os testes num mesmo arquivo ou numa classe.
- **`it('nome', () => {...})`**: um teste. O nome é uma frase que diz o que deve acontecer.
  Diferente do pytest, o nome não vem do nome da função; vem do texto.
- **`() => {...}`**: é uma função sem nome (função "seta", ou *arrow function*). O Jest guarda
  essa função e a chama na hora de rodar o teste.
- **`expect(valor).comparador(esperado)`**: a verificação. Faz o papel do `assert` do pytest.
  O `expect` recebe o valor real, e o comparador (*matcher*) diz o que conferir. Exemplos:
  `toBe(3)`, `toEqual({...})`, e os que vêm da Testing Library, como `toBeOnTheScreen()`.

Se o `expect` falhar, o teste para ali e o Jest mostra o esperado (`Expected`) e o recebido
(`Received`), como o pytest faz com os dois lados do `assert`.

## 4. `render` e `screen`: desenhar a tela sem celular

Fontes: https://oss.callstack.com/react-native-testing-library/docs/api/render e
https://oss.callstack.com/react-native-testing-library/docs/api/screen (conferidos em 2026-10-10).

```tsx
import { render, screen } from '@testing-library/react-native';
import InicioScreen from '@/app/index';

await render(<InicioScreen />);
expect(screen.getByText('Início')).toBeOnTheScreen();
```

- **`render(<Componente />)`**: desenha o componente num "celular de mentira" dentro do Jest. Não
  abre emulador nem Expo Go; tudo roda no terminal, em memória.
- **`screen`**: representa a tela desse celular. É nela que procuramos o que o usuário veria.
- **`screen.getByText('Início')`**: procura um elemento com esse texto exato. Se não achar, ou
  se achar mais de um, o teste falha na hora. Por isso escondemos o cabeçalho da tela: senão
  "Início" apareceria duas vezes.
- **`toBeOnTheScreen()`**: confirma que o elemento está na tela. Vem da Testing Library e não
  precisa de configuração extra; basta importar algo de `@testing-library/react-native`.

Por que procurar pelo texto visível: o teste imita o usuário, que lê "Início", e não sabe nada
de `View` ou de estilos. Assim, se mudarmos o layout por dentro, o teste continua valendo.

## 5. `async` e `await` nos testes

Fonte: https://oss.callstack.com/react-native-testing-library/docs/api/render (conferido em
2026-10-10): "the function is async".

Desde a versão 14 da Testing Library, o `render` é **assíncrono**: ele devolve uma *Promise*,
que é uma "promessa" de resultado que fica pronto um pouco depois. Para esperar, usamos:

- **`async`** na função do teste: avisa que dentro dela vai ter espera.
- **`await`** antes do `render`: espera o desenho terminar antes de seguir para o `expect`.

Esquecer o `await` faz o `expect` rodar antes de a tela existir, e o teste pode falhar (ou,
pior, passar por acaso).

## 6. Testar rotas: `renderRouter`

Fonte: https://docs.expo.dev/router/reference/testing/ (conferido em 2026-10-10).

O `expo-router` traz o seu próprio ajudante de testes, `renderRouter`, que monta o Router de
verdade com um "mapa de arquivos" em memória:

```tsx
import { renderRouter } from 'expo-router/testing-library';

const app = renderRouter(
  { _layout: RootLayout, index: InicioScreen },
  { initialUrl: '/' },
);
await app;
expect(app).toHavePathname('/');
```

- Cada chave do objeto imita um arquivo de `src/app/` (sem a barra inicial e sem `.tsx`).
- `initialUrl` é o endereço onde o app começa.
- `toHavePathname('/')` confere em qual endereço o Router está. Ele é registrado no `expect` só
  por importarmos `expo-router/testing-library`.

**Diferença da documentação (descoberta em 2026-10-10):** a documentação mostra
`await renderRouter(...)` seguido de `expect(screen).toHavePathname(...)`. Com as nossas versões
(expo-router 57.0.25 e Testing Library 14), isso dá o erro `screen.getPathname is not a
function`. O motivo: o `renderRouter` pendura o `getPathname()` na Promise que ele devolve, e
não no `screen`. Por isso guardamos o retorno numa variável (`app`), esperamos com `await app`
e passamos `app` para o `expect`. Se uma versão futura do expo-router corrigir isso, a forma da
documentação deve voltar a funcionar.

## 7. TypeScript nos testes

No `mobile/tsconfig.json`:

```json
"paths": { "@/*": ["./src/*"] },
"types": ["jest"]
```

- **`types: ["jest"]`**: faz o TypeScript conhecer `describe`, `it` e `expect` (os tipos vêm do
  pacote `@types/jest`). Sem isso, o `tsc` acusaria "Cannot find name 'describe'".
- **`paths`**: o atalho `@/` aponta para `src/`. O `jest-expo` lê esse `paths` e ensina o Jest a
  entender o mesmo atalho, então `import InicioScreen from '@/app/index'` funciona nos dois.

**O `// @ts-expect-error` no teste de rotas:** o expo-router 57.0.25 adiciona o
`toHavePathname` ao `expect` na hora de rodar, mas não publica o "tipo" dele para o TypeScript.
O Jest roda normalmente (ele não confere tipos), mas o `tsc --noEmit` reclamaria. O comentário
`// @ts-expect-error` diz ao TypeScript: "eu sei que a próxima linha tem um erro de tipo, pode
deixar". Se um dia o tipo for publicado, o `tsc` avisa que o comentário sobrou, e aí é só apagar.

## 8. Comandos que usamos

Sempre dentro de `mobile/`:

| Comando | O que faz |
|---|---|
| `npm test` | roda todos os testes uma vez e termina |
| `npx jest --verbose` | mostra o nome de cada teste e se passou (✓) ou falhou (✕) |
| `npx jest __tests__/rotas-test.tsx` | roda só um arquivo |
| `npx jest -t "Início"` | roda só os testes cujo nome contém "Início" (parecido com `pytest -k`) |
| `npx jest --watch` | fica vigiando e roda de novo os testes quando um arquivo muda (`Ctrl+C` para sair) |
| `npx tsc --noEmit` | confere os tipos do TypeScript sem gerar arquivos (não é o Jest, mas rodamos junto) |
| `npx expo lint` | o lint do mobile (o equivalente ao `ruff check`) |

Por que o script é `jest` e não `jest --watchAll` (que a documentação sugere): o modo vigia fica
rodando para sempre e espera teclas, o que atrapalha quando queremos rodar uma vez e ver o
resultado, como fazemos com o `pytest`.

## 9. Comparando com o pytest

| pytest | Jest |
|---|---|
| `def test_algo():` | `it('faz algo', () => {...})` |
| `assert x == 3` | `expect(x).toBe(3)` |
| arquivo `test_*.py` | arquivo dentro de `__tests__/` |
| `pytest -k nome` | `npx jest -t nome` |
| `pytest -v` | `npx jest --verbose` |
| `monkeypatch` | trocar uma função por um `jest.fn()` (seção 10) |
| fixture com `yield` | `beforeEach` (antes) e `afterEach` (depois), seção 11 |
| `pytest.raises` | `await expect(promessa).rejects...` (seção 14) |

## 10. Mocks: trocar o `fetch` por um dublê

Fonte: https://jestjs.io/docs/mock-functions (conferido em 2026-10-10).

A tela Início chama o `fetch`, a função do JavaScript que faz pedidos pela rede. Nos testes
não queremos rede de verdade: o backend pode estar desligado e os dados mudam. Então
trocamos o `fetch` por um **mock** (dublê): uma função falsa que devolve o que nós
escolhemos e **anota cada chamada**. É a mesma ideia do `monkeypatch` com a Pluggy falsa
no backend.

```tsx
fetchFalso = jest.fn<Promise<Response>, ParametrosDoFetch>();
globalThis.fetch = fetchFalso;          // a tela agora usa o dublê

fetchFalso.mockResolvedValue(respostaFalsa(200, criarResumo()));  // "dá certo"
fetchFalso.mockRejectedValueOnce(new Error('sem rede'));          // "dá erro", uma vez
```

- **`jest.fn()`**: cria a função falsa. Os tipos entre `< >` dizem que ela tem a "cara" do
  `fetch`.
- **`globalThis.fetch = ...`**: `globalThis` é o lugar onde ficam as coisas globais do
  JavaScript; trocando ali, todo código que chamar `fetch` recebe o dublê.
- **`mockResolvedValue(x)`**: toda chamada devolve uma Promise que dá certo com `x`.
- **`mockRejectedValueOnce(erro)`**: só a **próxima** chamada falha (o `Once` é "uma vez");
  as seguintes voltam ao comportamento normal. Assim o teste "sem conexão, tentar de novo"
  faz a 1ª chamada falhar e a 2ª dar certo.
- **`mockImplementation(função)`**: quando precisamos de um comportamento mais esperto (no
  teste dos 15 segundos, um `fetch` que só falha quando é cancelado).
- **`fetchFalso.mock.calls`**: a lista de chamadas anotadas. `mock.calls[0]` são os
  argumentos da primeira chamada: `[endereço, opções]`. É assim que o teste confere o
  endereço e o cabeçalho com o token.
- **`toHaveBeenCalledTimes(2)`**: confere quantas vezes o dublê foi chamado.

**Resposta falsa.** Uma `Response` de verdade tem dezenas de campos; a tela só usa `ok`,
`status` e `json()`. A função `respostaFalsa` monta só esses três e diz ao TypeScript "trate
como `Response`" (`as Response`), sem precisar de `any`.

## 11. `beforeEach` e `afterEach`

Fonte: https://jestjs.io/docs/setup-teardown (conferido em 2026-10-10).

```tsx
beforeEach(() => {   // antes de CADA teste: prepara
  globalThis.fetch = fetchFalso;
  process.env.EXPO_PUBLIC_API_URL = 'http://servidor-falso:8000';
});

afterEach(() => {    // depois de CADA teste: limpa
  globalThis.fetch = fetchOriginal;
  jest.useRealTimers();
});
```

É a fixture com `yield` do pytest dividida em duas: o `beforeEach` é a parte antes do
`yield`, e o `afterEach` a parte depois. Limpar importa: sem o `afterEach`, o `fetch` falso
de um teste vazaria para o próximo.

As variáveis do `.env` (`process.env.EXPO_PUBLIC_...`) também são trocadas no teste. Isso
funciona porque o código lê `process.env` **dentro** da função `buscarResumo()`, a cada
chamada, e não uma vez só quando o arquivo carrega.

## 12. Esperar e procurar: `findBy`, `getBy` e `queryBy`

Fonte: https://oss.callstack.com/react-native-testing-library/docs/api/queries (conferido em
2026-10-10).

A tela mostra "Carregando..." e só depois os dados (a resposta "chega" um pouco depois, mesmo
sendo falsa). Por isso existem três famílias de busca:

| Busca | Se não achar | Quando usar |
|---|---|---|
| `getByText('x')` | falha na hora | o elemento já tem que estar na tela |
| `await findByText('x')` | tenta de novo por até 1 segundo, depois falha | o elemento vai aparecer daqui a pouco (depois da resposta) |
| `queryByText('x')` | devolve `null`, sem falhar | conferir que algo **não** está na tela: `expect(screen.queryByText('Tentar de novo')).toBeNull()` |

Variações usadas: `getByLabelText` (procura pelo `accessibilityLabel`, o texto que o leitor de
tela fala), `getByRole('button', { name: 'Tentar de novo' })` (procura um botão pelo nome) e
`getAllByText(/ · /)` (todos os elementos cujo texto contém " · ", na ordem da tela; o
`/ · /` é uma expressão regular, um padrão de busca).

## 13. Tocar num botão: `fireEvent.press`

Fonte: https://oss.callstack.com/react-native-testing-library/docs/api/events/fire-event
(conferido em 2026-10-10).

```tsx
await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
```

Simula um toque. Na versão 14 ele é assíncrono, por isso o `await`. Existe também o
`userEvent.press`, que imita o toque com mais realismo (aperta, espera, solta), mas leva pelo
menos 130 ms; para o nosso caso o `fireEvent` basta.

## 14. Relógio falso (fake timers)

Fonte: https://jestjs.io/docs/timer-mocks (conferido em 2026-10-10).

O `buscarResumo()` desiste depois de 15 segundos (`setTimeout`). Esperar 15 segundos de
verdade num teste seria lento. O Jest troca o relógio por um falso, que só anda quando nós
mandamos:

```tsx
jest.useFakeTimers();                       // liga o relógio falso
const promessa = buscarResumo();            // começa, sem await
const verificacao = expect(promessa).rejects.toMatchObject({ tipo: 'conexao' });

await jest.advanceTimersByTimeAsync(14999); // "passaram" 14,999 s
expect(sinal?.aborted).toBe(false);         // ainda não desistiu
await jest.advanceTimersByTimeAsync(1);     // completou 15 s
await verificacao;                          // agora falhou com "conexao"
```

- **`jest.useFakeTimers()`** liga o relógio falso; **`jest.useRealTimers()`** (no
  `afterEach`) volta ao de verdade.
- **`advanceTimersByTimeAsync(ms)`** adianta o relógio e deixa as Promises andarem. A versão
  sem `Async` não deixa, e o teste poderia conferir antes da hora.
- **`expect(promessa).rejects`** confere que a Promise **falha**; é o `pytest.raises` do Jest.
  Ele é combinado **antes** de adiantar o relógio, para a falha não acontecer "sem ninguém
  olhando" (o Jest acusaria uma Promise rejeitada sem tratamento).
- Conferir 14999 ms e depois 15000 ms prova que o limite é exatamente 15 segundos, e não "em
  algum momento".

O `renderRouter` liga o relógio falso sozinho; por isso o `rotas-test.tsx` também chama
`jest.useRealTimers()` no `afterEach`.

## 15. Um dublê que responde por endereço

Fonte: https://jestjs.io/docs/mock-function-api#mockfnmockimplementationfn (conferido em
2026-10-10).

Na tela Início com a folha de edição, o `fetch` é chamado para três coisas diferentes: o
resumo, a leitura das configurações e o `PATCH` que salva. Um `mockResolvedValue` devolveria
a mesma resposta para todas. O `mockImplementation` recebe uma função que **olha o pedido** e
escolhe a resposta, como um backend de mentira:

```tsx
fetchFalso.mockImplementation(async (endereco, opcoes) => {
  const url = String(endereco);
  if (url.includes('/api/resumo/')) return respostaFalsa(200, criarResumo());
  if (url.includes('/api/configuracoes/') && opcoes?.method === 'PATCH') return patch;
  if (url.includes('/api/configuracoes/')) return respostaFalsa(200, CONFIGURACOES_DE_EXEMPLO);
  throw new Error(`Endereço inesperado no teste: ${url}`);
});
```

- A última linha falha "alto" se a tela pedir algo que o teste não esperava: o erro aparece
  na hora, em vez de um teste que passa por acaso.
- Para conferir o que foi enviado, o teste filtra `fetchFalso.mock.calls` (só os `PATCH`) e
  lê o corpo com `JSON.parse(opcoes.body)`, comparando objetos com `toEqual`.

## 16. Trocar um pacote inteiro: `jest.mock`

Fonte: https://jestjs.io/docs/jest-object#jestmockmodulename-factory-options (conferido em
2026-10-10).

O `_layout.tsx` espera a fonte Manrope carregar antes de desenhar. No Jest não existe celular
para carregar fonte, então o `rotas-test.tsx` troca o pacote da fonte por um dublê:

```tsx
jest.mock('@expo-google-fonts/manrope', () => ({
  useFonts: () => [true, null],   // "já carregou, sem erro"
  Manrope_400Regular: 'Manrope_400Regular',
  // ...os outros pesos
}));
```

- `jest.mock('pacote', fábrica)` faz todo `import` desse pacote, no arquivo de teste, receber
  o que a fábrica devolve.
- O Jest move o `jest.mock` para o topo do arquivo, antes dos `import`, então o layout já
  nasce com o dublê.
- É o "monkeypatch de um pacote inteiro"; o `globalThis.fetch = ...` da seção 10 troca uma
  função só.

## 17. Digitar, elementos escondidos e propriedades

Fontes: https://oss.callstack.com/react-native-testing-library/docs/api/events/fire-event e
https://oss.callstack.com/react-native-testing-library/docs/api/queries (conferidos em
2026-10-10).

- **Digitar num campo:** `await fireEvent.changeText(campo, '2')` imita a pessoa digitando
  "2". O campo é achado pelo rótulo: `screen.getByLabelText('Dias antes do dia 1')`.
- **Conferir o valor de um campo:** `expect(campo).toHaveDisplayValue('3')`.
- **Elementos escondidos do leitor de tela:** a Testing Library ignora, por padrão, o que está
  escondido (como a sigla "ME" do ícone, escondida porque o rótulo do gasto já fala a
  categoria). Para procurar mesmo assim:
  `screen.getByText('ME', { includeHiddenElements: true })`.
- **Conferir uma propriedade:** não existe comparador próprio para a dica do leitor de tela
  (`accessibilityHint`). A documentação indica o `toHaveProp` como último recurso:
  `expect(botao).toHaveProp('accessibilityHint', 'Toque para mudar o início do mês')`.
- **Botões pelo nome:** `screen.findByRole('button', { name: 'Saldo: 1.250,50 reais' })` acha
  o cartão tocável pelo papel ("button") e pelo rótulo; se ele não tivesse
  `accessibilityRole="button"`, o teste falharia, e é isso que prova a acessibilidade.
