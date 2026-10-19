import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
// No Expo Router 57, o Tabs exportado por 'expo-router' está obsoleto
// (@deprecated na fonte do pacote); o caminho novo é 'expo-router/js-tabs'
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import BarraDeAbas from '@/componentes/BarraDeAbas';
import { cores } from '@/tema';

// Com as abas fora da ordem do arquivo (o Início fica no centro, e não em
// primeiro), dizemos ao Expo Router qual é a rota inicial. Sem isto ele
// escolheria a primeira da lista (Transações) quando abrisse sem endereço.
// "index" é o arquivo (abas)/index.tsx, a tela Início.
export const unstable_settings = {
  initialRouteName: 'index',
};

// Desenha o ícone de uma aba. A barra de abas passa a cor certa (acento na aba
// ativa, textoSecundario nas outras). O ícone fica escondido do leitor de tela,
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

// Layout do grupo (abas): a barra de abas embaixo, com as cinco telas.
// Os parênteses no nome da pasta fazem o grupo não aparecer no endereço:
// app/(abas)/transacoes.tsx vira "/transacoes", e app/(abas)/index.tsx vira "/".
export default function AbasLayout() {
  return (
    <Tabs
      // A barra é nossa (BarraDeAbas): ela recebe o estado do navegador e as
      // opções de cada tela (title e tabBarIcon) e desenha a bolha animada.
      // Cuida também da área segura de baixo.
      tabBar={(props) => <BarraDeAbas {...props} />}
      // Mesma rota inicial do unstable_settings acima, também no navegador de
      // abas; e "voltar" (botão do Android) leva ao Início, e não à primeira
      // aba da lista, que agora é Transações.
      initialRouteName="index"
      backBehavior="initialRoute"
      screenOptions={{
        // Cada tela mostra o próprio título no corpo, como o Início
        headerShown: false,
        // Fundo das telas, para não aparecer o branco padrão na troca de aba
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      {/* A ordem aqui é a ordem das abas na barra, com o Início no centro
          (3º de 5). O título é também o nome lido pelo leitor de tela */}
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
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => iconeDaAba('house', color),
        }}
      />
      <Tabs.Screen
        name="contas"
        options={{
          title: 'Contas',
          tabBarIcon: ({ color }) => iconeDaAba('landmark', color),
        }}
      />
      <Tabs.Screen
        name="dividas"
        options={{
          title: 'A pagar',
          tabBarIcon: ({ color }) => iconeDaAba('hand-coins', color),
        }}
      />
    </Tabs>
  );
}
