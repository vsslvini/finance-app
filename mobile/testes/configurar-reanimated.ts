// Prepara o Reanimated para o Jest (roda antes de cada arquivo de teste).
// setUpTests() troca as partes nativas do Reanimated por versões que funcionam
// no Node e liga os comparadores de estilo animado. Na versão 4.5.1 instalada,
// ele vem exportado do próprio pacote (a pasta react-native-reanimated/jest/
// citada na documentação mais nova ainda não existe nesta versão).
require('react-native-reanimated').setUpTests();

// Dublê do lottie-react-native: no Node não existe o componente nativo que
// toca a animação, e o jest-expo não traz um. O dublê desenha uma View vazia
// com o mesmo testID, para os testes poderem achar a animação na tela.
jest.mock('lottie-react-native', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  function LottieFalso({ testID, style }: { testID?: string; style?: unknown }) {
    return React.createElement(View, { testID, style });
  }
  return { __esModule: true, default: LottieFalso };
});
