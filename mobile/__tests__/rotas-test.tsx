// renderRouter monta o Expo Router de verdade dentro do Jest, com as rotas
// que passarmos. screen, importado daqui, é a mesma "tela" da Testing
// Library. Importar este módulo também ensina ao expect os comparadores do
// Router, como o toHavePathname.
import { renderRouter, screen } from 'expo-router/testing-library';

// Os arquivos de rota reais, pelo atalho @/ (que aponta para src/).
import RootLayout from '@/app/_layout';
import InicioScreen from '@/app/index';

// A tela inicial busca o resumo no backend assim que aparece. Este teste só
// quer saber se o Router achou a tela, então trocamos o fetch por um dublê
// (mock) que nunca responde: a tela fica parada em "carregando", sem rede.
// Os detalhes de mock estão em tela-inicio-test.tsx.
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = jest.fn(() => new Promise<Response>(() => {}));
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  // O renderRouter liga o relógio falso do Jest; aqui voltamos ao de verdade.
  jest.useRealTimers();
});

describe('Rotas do app', () => {
  it('o Router encontra a tela inicial pelo arquivo', async () => {
    // Prepara: monta o Router com um "mapa de arquivos" em memória. Cada
    // chave é o caminho do arquivo dentro de src/app, sem a barra inicial e
    // sem a extensão; cada valor é o componente daquele arquivo. A navegação
    // começa no endereço "/".
    //
    // Guardamos o retorno numa variável: no expo-router 57.0.25 com a
    // Testing Library 14, o getPathname() fica preso nesse retorno (uma
    // Promise), e não no screen como mostra a documentação. O await espera a
    // tela terminar de desenhar.
    const app = renderRouter(
      {
        _layout: RootLayout,
        index: InicioScreen,
      },
      { initialUrl: '/' },
    );
    await app;

    // Verifica: o endereço atual do Router é "/".
    // @ts-expect-error O expo-router adiciona o toHavePathname ao expect, mas
    // não publica o tipo dele para o TypeScript; o Jest roda normalmente.
    expect(app).toHavePathname('/');

    // Verifica: o arquivo index foi o escolhido para "/", porque aparece o
    // primeiro estado da tela inicial.
    expect(screen.getByText('Carregando o resumo...')).toBeOnTheScreen();
  });
});
