import { Lucide } from '@react-native-vector-icons/lucide';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarRelatorio } from '@/api';
import Carregando from '@/componentes/Carregando';
import ConteudoDoRelatorio from '@/componentes/ConteudoDoRelatorio';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import RelatorioDoMes from '@/componentes/RelatorioDoMes';
import { mesVizinho, tituloDoMes } from '@/formatacao';
import { cores, espaco, textos, toque } from '@/tema';
import { useCarga } from '@/useCarga';

// Tela Relatório (RF27): os números de um mês, os gastos por categoria e os
// maiores gastos. Fica fora do grupo (abas), então abre na pilha da raiz, por
// cima das abas (a barra de abas some), e o Início a abre com router.push.
//
// Fluxo: a tela abre e pede /api/relatorio/ sem ?mes=. O backend responde com
// o relatório do mês atual do app, e o campo "mes" da resposta diz qual é esse
// mês. Com ele, a tela desenha as setas. Enquanto a pessoa não mexe nas setas,
// o conteúdo vem deste primeiro pedido; depois, o RelatorioDoMes busca o mês
// escolhido com ?mes=.
export default function RelatorioScreen() {
  // buscarRelatorio é uma função da api.ts, então é sempre a mesma (o useCarga
  // pede isso). O useCarga a chama sem argumentos: o pedido vai sem ?mes=
  const atual = useCarga(buscarRelatorio);
  // O mês escolhido com as setas; null = ainda não mexeu, e vale o primeiro
  // pedido. Assim não precisamos de useEffect para copiar o mês da resposta
  // para cá: calculamos durante a renderização, como na tela Transações.
  const [mesEscolhido, setMesEscolhido] = useState<string | null>(null);

  // Normalmente a tela foi aberta pelo Início, e o back() volta para lá. Se
  // ela abriu direto por um link, não há tela antes dela: vamos para o Início
  function voltar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  // Topo fixo: botão "Voltar" e o título da tela. Aparece em todos os
  // estados, para a pessoa sempre conseguir sair
  const topo = (
    <View style={styles.linhaDoTopo}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={voltar}
        style={({ pressed }) => [styles.botaoDeIcone, pressed && toque.apertadoIcone]}
      >
        <Lucide
          name="chevron-left"
          size={24}
          color={cores.texto}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
      <Text accessibilityRole="header" style={[textos.titulo, styles.tituloNoMeio]}>
        Relatório
      </Text>
      {/* Espaço do tamanho do botão, para o título ficar centralizado */}
      <View style={styles.botaoDeIcone} />
    </View>
  );

  if (atual.estado.tipo === 'carregando') {
    return (
      <SafeAreaView style={styles.tela}>
        {topo}
        <Carregando texto="Carregando o relatório..." />
      </SafeAreaView>
    );
  }

  if (atual.estado.tipo === 'erro') {
    // Sem o primeiro pedido não sabemos o mês atual: o erro ocupa o lugar das
    // setas e do conteúdo, e "Tentar de novo" refaz o pedido sem ?mes=
    return (
      <SafeAreaView style={styles.tela}>
        {topo}
        <MensagemDeErro erro={atual.estado.erro} aoTentarDeNovo={atual.recarregar} />
      </SafeAreaView>
    );
  }

  const mesAtual = atual.estado.dados.mes;
  const mes = mesEscolhido ?? mesAtual;
  // Meses futuros não têm relatório: no mês atual, "Próximo mês" desativa.
  // Os meses "AAAA-MM" podem ser comparados como texto ("2026-09" < "2026-10")
  const noMesAtual = mes >= mesAtual;

  return (
    <SafeAreaView style={styles.tela}>
      {topo}

      {/* Setas de mês, iguais às da tela Transações. Ficam paradas enquanto só
          o conteúdo embaixo carrega */}
      <View style={styles.linhaDoMes}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => setMesEscolhido(mesVizinho(mes, -1))}
          style={({ pressed }) => [styles.botaoDeIcone, pressed && toque.apertadoIcone]}
        >
          <Lucide
            name="chevron-left"
            size={24}
            color={cores.texto}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Pressable>

        <Text accessibilityRole="header" style={[textos.titulo, styles.tituloNoMeio]}>
          {tituloDoMes(mes)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          // disabled faz o toque não chamar o onPress; accessibilityState
          // avisa o leitor de tela que o botão está desativado
          disabled={noMesAtual}
          accessibilityState={{ disabled: noMesAtual }}
          onPress={() => setMesEscolhido(mesVizinho(mes, 1))}
          style={({ pressed }) => [styles.botaoDeIcone, pressed && toque.apertadoIcone]}
        >
          <Lucide
            name="chevron-right"
            size={24}
            // Desativado em textoTerciario (o guia usa esse tom para o que está desativado)
            color={noMesAtual ? cores.textoTerciario : cores.texto}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Pressable>
      </View>

      {mesEscolhido === null ? (
        // Ainda no primeiro pedido: o puxar para baixo relê sem ?mes=
        <ConteudoDoRelatorio
          relatorio={atual.estado.dados}
          atualizar={atual.atualizar}
          atualizando={atual.atualizando}
          falhouAoAtualizar={atual.falhouAoAtualizar}
        />
      ) : (
        // key={mes}: ao trocar de mês, o conteúdo começa do zero em
        // "carregando" (ver o comentário no topo de RelatorioDoMes.tsx)
        <RelatorioDoMes key={mes} mes={mes} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  linhaDoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaco.pequeno,
    paddingTop: espaco.pequeno,
  },
  linhaDoMes: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaco.pequeno,
    paddingBottom: espaco.pequeno,
  },
  botaoDeIcone: {
    // Área de toque mínima do guia (44x44)
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloNoMeio: {
    // O título ocupa o meio, entre os dois botões (ou o botão e o espaço)
    flex: 1,
    textAlign: 'center',
  },
});
