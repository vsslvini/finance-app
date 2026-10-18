import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
// No Expo Router 57, o Tabs exportado por 'expo-router' está obsoleto
// (@deprecated na fonte do pacote); o caminho novo é 'expo-router/js-tabs'
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cores, textos } from '@/tema';

// Desenha o ícone de uma aba. A barra passa a cor certa (acento na aba ativa,
// textoSecundario nas outras). O ícone fica escondido do leitor de tela,
// porque o nome da aba já diz tudo.
function iconeDaAba(nome: LucideIconName, color: ColorValue) {
  return (
    <Lucide
      name={nome}
      size={24}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

// Layout do grupo (abas): a barra de abas embaixo, com as quatro telas.
// Os parênteses no nome da pasta fazem o grupo não aparecer no endereço:
// app/(abas)/transacoes.tsx vira "/transacoes", e app/(abas)/index.tsx vira "/".
export default function AbasLayout() {
  // A área segura de baixo do celular (a barra de gestos ou os botões do
  // Android). A barra de abas fica com 64 de altura mais essa área, e o
  // próprio Tabs já põe esse espaço como respiro embaixo dos ícones.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // Cada tela mostra o próprio título no corpo, como o Início
        headerShown: false,
        tabBarActiveTintColor: cores.acento,
        tabBarInactiveTintColor: cores.textoSecundario,
        tabBarStyle: {
          backgroundColor: cores.superficie,
          borderTopWidth: 1,
          borderTopColor: cores.borda,
          height: 64 + insets.bottom,
        },
        // Só a fonte do estilo "rotulo", sem a cor: a cor do texto vem do
        // tabBarActiveTintColor e do tabBarInactiveTintColor. Se o estilo
        // levasse a cor, ela venceria e a aba ativa não ficaria roxa.
        tabBarLabelStyle: {
          fontFamily: textos.rotulo.fontFamily,
          fontSize: textos.rotulo.fontSize,
          lineHeight: textos.rotulo.lineHeight,
        },
        // Fundo das telas, para não aparecer o branco padrão na troca de aba
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      {/* A ordem aqui é a ordem das abas na barra. Sem tabBarAccessibilityLabel,
          o leitor de tela lê o título com a posição ("Transações, aba 2 de 4") */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => iconeDaAba('house', color),
        }}
      />
      <Tabs.Screen
        name="transacoes"
        options={{
          title: 'Transações',
          tabBarIcon: ({ color }) => iconeDaAba('arrow-left-right', color),
        }}
      />
      <Tabs.Screen
        name="cartoes"
        options={{
          title: 'Cartões',
          tabBarIcon: ({ color }) => iconeDaAba('credit-card', color),
        }}
      />
      <Tabs.Screen
        name="contas"
        options={{
          title: 'Contas',
          tabBarIcon: ({ color }) => iconeDaAba('landmark', color),
        }}
      />
    </Tabs>
  );
}
