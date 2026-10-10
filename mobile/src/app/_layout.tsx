import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { cores } from '@/tema';

// Layout raiz: todas as telas de src/app/ ficam dentro desta pilha (Stack).
// O cabeçalho fica escondido; cada tela mostra o próprio título no corpo.
export default function RootLayout() {
  // Carrega os pesos da Manrope usados no app (nomes iguais aos de fontes, em tema.ts)
  const [carregadas, erro] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Enquanto as fontes carregam, não desenha nada (é bem rápido).
  // Se der erro, seguimos com a fonte do sistema (a reserva do guia).
  if (!carregadas && !erro) {
    return null;
  }

  return (
    <>
      {/* Tema escuro: texto claro na barra de status do celular */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}
      />
    </>
  );
}
