# Módulo 3a: base do mobile

Escrito em 2026-10-10. Este é o passo 1 da arquitetura (`docs/arquitetura.md`, seção 5) e a
primeira parte do Módulo 3 (app mobile). Não atende nenhum RF sozinho: prepara o terreno
para as telas do Módulo 3b. **Antes, estude** [`../jest.md`](../jest.md), seções 1 a 5.

- [Módulo 3a: base do mobile](#módulo-3a-base-do-mobile)
  - [1. O que o módulo entrega](#1-o-que-o-módulo-entrega)
  - [2. Conceitos novos](#2-conceitos-novos)
  - [3. As dependências e os problemas de versão](#3-as-dependências-e-os-problemas-de-versão)
  - [4. O caminho do app ao abrir](#4-o-caminho-do-app-ao-abrir)
  - [5. Arquivo por arquivo](#5-arquivo-por-arquivo)
  - [6. Os testes, um por um](#6-os-testes-um-por-um)
  - [7. Testar à mão](#7-testar-à-mão)
  - [8. Limites e pendências](#8-limites-e-pendências)
  - [9. Para estudar mais](#9-para-estudar-mais)

## 1. O que o módulo entrega

- O **Expo Router** no lugar do `App.tsx`: cada arquivo em `mobile/src/app/` vira uma tela.
- Uma tela provisória **Início** na rota `/` (só o título; a tela de verdade vem no 3b).
- O **Jest** funcionando, com o `jest-expo` e a React Native Testing Library, e o script
  `npm test`.
- As pendências antigas do mobile corrigidas: `@testing-library/react-native` e `@types/jest`
  saíram de `dependencies` e foram para `devDependencies`; entraram `jest`, `jest-expo` e o
  script `"test"`.
- 2 testes passando, lint e `tsc` sem erros.

## 2. Conceitos novos

### Roteamento por arquivos (Expo Router)

Fonte: https://docs.expo.dev/router/introduction/ (conferido em 2026-10-10).

Antes, o app tinha uma porta de entrada só: o `index.ts` registrava o componente do
`App.tsx`, e tudo partia dali. Para ter várias telas, precisaríamos montar a navegação à mão.

Com o Expo Router, **a pasta é o mapa do app**:

| Arquivo | Vira |
|---|---|
| `src/app/index.tsx` | a tela da rota `/` (a primeira) |
| `src/app/transacoes.tsx` (no 3b) | a tela da rota `/transacoes` |
| `src/app/_layout.tsx` | não é tela: é a "moldura" que envolve as telas daquela pasta |

É a mesma ideia do `urls.py` do Django (um endereço leva a uma tela), só que, em vez de
escrever a lista de rotas, o Router lê os nomes dos arquivos.

### `_layout.tsx` e a `Stack`

O `_layout.tsx` diz **como** as telas se organizam. Usamos uma `Stack` (pilha): cada tela
nova entra por cima da anterior, e o "voltar" tira a de cima. No 3b, ele vai virar abas
(Início, Transações, Cartões, Contas).

### Dependência "par" (peer dependency)

Alguns pacotes não trazem tudo de que precisam; eles dizem "eu funciono com a versão X do
pacote Y que **você** instalar". Isso é uma *peer dependency*. O npm (desde a versão 7)
instala esses pares sozinho, escolhendo a versão mais nova que encontra, e foi isso que
causou os problemas da seção 3.

### `package-lock.json`

O `package.json` diz as versões aceitas (ex.: `~57.0.27`, qualquer 57.0.x a partir da 27).
O `package-lock.json` grava a versão **exata** de cada pacote instalado, inclusive os
pacotes dos pacotes, e onde cada um fica no `node_modules`. É o equivalente ao nosso
`requirements.txt` com `==` no backend: garante instalações sempre iguais. Ele entra no
commit.

## 3. As dependências e os problemas de versão

Instaladas com `npx expo install`, que escolhe as versões compatíveis com o SDK 57:

| Pacote | Onde | Por quê |
|---|---|---|
| `expo-router` | `dependencies` | a navegação por arquivos |
| `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants` | `dependencies` | exigidos pelo Expo Router |
| `react-dom` 19.2.3 | `dependencies` | par exigido pelo Router; fixado na mesma versão do `react` |
| `react-native-reanimated` 4.5.1, `react-native-worklets` 0.10.1 | `dependencies` | pares exigidos por dentro do Router; fixados nas versões do SDK 57 |
| `jest`, `jest-expo`, `@types/jest` | `devDependencies` | rodam os testes |
| `@testing-library/react-native` | `devDependencies` | desenha a tela nos testes |
| `test-renderer` 1.2.0 | `devDependencies` | motor da Testing Library; fixado para aceitar React 19.2 |

`dependencies` vai para dentro do app; `devDependencies` só existe no computador de quem
desenvolve. Por isso as ferramentas de teste ficam em `devDependencies`.

O `expo` também subiu de 57.0.26 para 57.0.27 (correção pequena, sugerida pelo
`npx expo-doctor`).

### O que deu errado e como resolvemos

1. **`--dev` ignorado.** O comando da documentação (`npx expo install ... -- --dev`) colocou os
   pacotes de teste em `dependencies`. Corrigimos movendo as três linhas para
   `devDependencies` no `package.json` e rodando `npm install`.
2. **Pares novos demais.** O npm instalou sozinho o `react-dom` 19.3.0, o `test-renderer`
   1.3.0 (os dois exigem React 19.3; o Expo 57 usa 19.2.3) e o `react-native-reanimated` 4.7.1
   com o `react-native-worklets` 0.13.0 (o SDK 57 espera 4.5.1 e 0.10.1). Corrigimos
   declarando esses pacotes no `package.json` com as versões certas. A lista oficial de
   versões do SDK fica em `node_modules/expo/bundledNativeModules.json`.
3. **Pacote no lugar errado.** Depois de atualizar o `expo`, o npm deixou o
   `expo-modules-core` dentro de `node_modules/expo/node_modules/`, e não na raiz. O
   `jest-expo` procura na raiz e o teste quebrava com `Cannot find module
   'expo-modules-core'`. O `package-lock.json` tinha gravado esse lugar, então `npm dedupe`
   não resolveu. Corrigimos apagando o `node_modules` e o `package-lock.json` e rodando
   `npm install` de novo, que gerou um lock limpo.

Como conferir que a árvore está saudável: `npm ls` sem linhas `invalid` e `npx expo-doctor`
com "21/21 checks passed".

## 4. O caminho do app ao abrir

```
npx expo start
   └─► package.json  "main": "expo-router/entry"
          └─► o Expo Router lê a pasta src/app/
                 ├─► _layout.tsx  monta a Stack (sem cabeçalho)
                 └─► index.tsx    é a rota "/", então é a primeira tela
                        └─► mostra "Início" no centro
```

## 5. Arquivo por arquivo

### `mobile/package.json` (alterado)

- `"main": "expo-router/entry"`: a porta de entrada agora é o Router (antes, `index.ts`).
- `"scripts": { "test": "jest" }`: o `npm test`.
- `"jest": { "preset": "jest-expo" }`: a configuração pronta do Expo para o Jest.
- As dependências da seção 3.

### `mobile/package-lock.json` (gerado de novo)

Gerado do zero pelo `npm install` (seção 3, problema 3). Não se edita à mão.

### `mobile/app.json` (alterado)

- `"scheme": "appfinancas"`: o nome usado nos links que abrem o app (`appfinancas://...`). O
  Router pede esse campo.
- `"plugins": ["expo-router"]`: adicionado sozinho pelo `npx expo install expo-router`.

### `mobile/tsconfig.json` (alterado)

- `"paths": { "@/*": ["./src/*"] }`: o atalho `@/` aponta para `src/`.
- `"types": ["jest"]`: o TypeScript passa a conhecer `describe`, `it` e `expect`. Ver
  [`../jest.md`](../jest.md), seção 7.

### `mobile/src/app/_layout.tsx` (novo)

A moldura do app: uma `Stack` com `headerShown: false` (sem a barra de título no topo). O
cabeçalho foi escondido porque a tela já mostra o próprio título; com os dois, "Início"
apareceria duas vezes.

### `mobile/src/app/index.tsx` (novo)

A tela provisória da rota `/`: uma `View` que ocupa a tela toda (`flex: 1`) e centraliza um
`Text` "Início" em negrito. O `accessibilityRole="header"` avisa aos leitores de tela que
aquilo é um título.

### `mobile/App.tsx` e `mobile/index.ts` (a apagar)

Não são mais usados: o `"main"` aponta para o Router. Ver seção 8.

## 6. Os testes, um por um

Rodar só os testes deste módulo: `cd mobile && npm test` (são os únicos por enquanto).

### `mobile/__tests__/inicio-test.tsx`: "Tela inicial > abre mostrando o texto "Início""

**Caso aprovado:** ao abrir o app na rota `/`, aparece o título "Início".

1. **Prepara:** `await render(<InicioScreen />)` desenha só a tela, sem o Router. O `await`
   espera o desenho terminar ([`../jest.md`](../jest.md), seção 5).
2. **Verifica:** `screen.getByText('Início')` procura o texto exato, e `toBeOnTheScreen()`
   confirma que ele está na tela.

Por que importa: é o teste mais simples possível. Se ele passa, o Jest, o `jest-expo`, o
atalho `@/` e a tela estão funcionando juntos.

### `mobile/__tests__/rotas-test.tsx`: "Rotas do app > o Router encontra a tela inicial pelo arquivo"

**Caso aprovado:** o app começa na rota `/` e mostra a tela de `index.tsx`.

1. **Prepara:** `renderRouter({ _layout: RootLayout, index: InicioScreen }, { initialUrl: '/' })`
   monta o Expo Router de verdade, com um mapa de arquivos em memória que imita a pasta
   `src/app/`. Guardamos o retorno em `app` e esperamos com `await app`.
2. **Verifica, em duas partes:**
   - `expect(app).toHavePathname('/')`: o Router está no endereço `/`;
   - `screen.getByText('Início')`: a tela que apareceu é a do `index`, dentro do `_layout`.

Por que importa: o teste 1 desenha a tela "na mão"; este prova que o **Router** escolhe o
arquivo certo para o endereço, ou seja, que a troca do `App.tsx` pelo Router funcionou.

Por que `expect(app)` e não `expect(screen)`, como na documentação: ver
[`../jest.md`](../jest.md), seção 6. Conferimos que o teste é de verdade trocando o esperado
para `/outra`: ele falhou com `Expected: "/outra"`, `Received: "/"`.

### Ver o vermelho com os próprios olhos

Troque, por um instante, `'Início'` por `'Inicio'` (sem acento) no `inicio-test.tsx` e rode
`npm test`. O erro esperado é `Unable to find an element with text: Inicio`. Depois, volte.

## 7. Testar à mão

Dentro de `mobile/`:

1. `npm test`: espere `Tests: 2 passed, 2 total`.
2. `npx expo lint` e `npx tsc --noEmit`: espere nenhuma saída (nenhum erro).
3. `npx expo-doctor`: espere `21/21 checks passed`.
4. `npx expo start` e abra no Expo Go (lendo o QR code): espere uma tela branca, sem
   cabeçalho, com "Início" em negrito no centro. Se o app já estava aberto, use
   `npx expo start --clear` para limpar o cache do bundler, como a documentação do Router
   recomenda.

## 8. Limites e pendências

- **`App.tsx` e `index.ts` ainda existem** e precisam ser apagados (não são mais usados).
- O `toHavePathname` não tem tipo publicado no expo-router 57.0.25; usamos
  `// @ts-expect-error` ([`../jest.md`](../jest.md), seção 7).
- A forma da documentação `expect(screen).toHavePathname(...)` não funciona com as nossas
  versões ([`../jest.md`](../jest.md), seção 6).
- Ficaram de fora, de propósito: rotas tipadas (`typedRoutes`), suporte a web e as abas (que
  entram no 3b, depois da proposta do `mobile-ui-expert`).

## 9. Para estudar mais

- Expo Router, introdução: https://docs.expo.dev/router/introduction/
- Expo Router, instalação manual: https://docs.expo.dev/router/installation/
- Testes com Jest no Expo: https://docs.expo.dev/develop/unit-testing/
- Testes de rotas: https://docs.expo.dev/router/reference/testing/
- React Native Testing Library: https://oss.callstack.com/react-native-testing-library/
