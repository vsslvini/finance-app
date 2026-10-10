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
| `monkeypatch` | `jest.fn()` e `jest.mock()` (ainda não usamos; vão aparecer quando as telas chamarem a API) |
| fixture | `beforeEach` ou funções ajudantes (ainda não usamos) |
