import { Stack } from 'expo-router';

// Layout raiz: todas as telas de src/app/ ficam dentro desta pilha (Stack).
// O cabeçalho fica escondido; cada tela mostra o próprio título no corpo.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
