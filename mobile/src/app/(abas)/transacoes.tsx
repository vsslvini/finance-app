import { Lucide } from '@react-native-vector-icons/lucide';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarResumo } from '@/api';
import Carregando from '@/componentes/Carregando';
import ListaDeTransacoes from '@/componentes/ListaDeTransacoes';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import { mesVizinho, tituloDoMes } from '@/formatacao';
import { cores, espaco, textos } from '@/tema';
import { useCarga } from '@/useCarga';

// Tela Transações: as transações de um mês, com setas para trocar de mês.
//
// Fluxo: a tela abre, busca o resumo só para saber qual é o mês atual do app
// (o backend já aplica o "mês começando dias antes"), e então a
// ListaDeTransacoes busca as transações desse mês. As setas mudam o mês
// escolhido, e a lista busca o mês novo.
export default function TransacoesScreen() {
  // buscarResumo é uma função da api.ts, então é sempre a mesma (o useCarga pede isso)
  const resumo = useCarga(buscarResumo);
  // O mês que a pessoa escolheu com as setas; null = ainda não mexeu, e vale
  // o mês do resumo. Assim não precisamos de um useEffect para copiar o mês
  // do resumo para cá quando ele chega: calculamos durante a renderização.
  const [mesEscolhido, setMesEscolhido] = useState<string | null>(null);

  // A borda de baixo fica com a barra de abas, que já cuida da área segura
  if (resumo.estado.tipo === 'carregando') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
        <Carregando texto="Carregando as transações..." />
      </SafeAreaView>
    );
  }

  if (resumo.estado.tipo === 'erro') {
    // Sem o resumo não sabemos o mês: o erro ocupa a tela toda, e "Tentar de
    // novo" refaz tudo (o resumo e depois a lista)
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
        <MensagemDeErro erro={resumo.estado.erro} aoTentarDeNovo={resumo.recarregar} />
      </SafeAreaView>
    );
  }

  const mesAtual = resumo.estado.dados.mes;
  const mes = mesEscolhido ?? mesAtual;
  // Meses futuros ficam para depois (RF13): no mês atual, "Próximo mês" desativa.
  // Os meses "AAAA-MM" podem ser comparados como texto ("2026-09" < "2026-10")
  const noMesAtual = mes >= mesAtual;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
      {/* Cabeçalho fixo: fica na tela mesmo enquanto a lista carrega ou dá erro */}
      <View style={styles.cabecalho}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => setMesEscolhido(mesVizinho(mes, -1))}
          style={({ pressed }) => [styles.seta, pressed && styles.apertado]}
        >
          <Lucide
            name="chevron-left"
            size={24}
            color={cores.texto}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Pressable>

        <Text accessibilityRole="header" style={[textos.titulo, styles.titulo]}>
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
          style={({ pressed }) => [styles.seta, pressed && styles.apertado]}
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

      {/* key={mes}: ao trocar de mês, a lista começa do zero (ver o comentário
          no topo de ListaDeTransacoes.tsx) */}
      <ListaDeTransacoes key={mes} mes={mes} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaco.pequeno,
    paddingVertical: espaco.pequeno,
  },
  seta: {
    // Área de toque mínima do guia (44x44)
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apertado: {
    opacity: 0.7,
  },
  titulo: {
    // O título ocupa o meio, entre as duas setas
    flex: 1,
    textAlign: 'center',
  },
});
