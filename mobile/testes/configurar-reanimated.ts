// Prepara o Reanimated para o Jest (roda antes de cada arquivo de teste).
// setUpTests() troca as partes nativas do Reanimated por versões que funcionam
// no Node e liga os comparadores de estilo animado. Na versão 4.5.1 instalada,
// ele vem exportado do próprio pacote (a pasta react-native-reanimated/jest/
// citada na documentação mais nova ainda não existe nesta versão).
require('react-native-reanimated').setUpTests();
