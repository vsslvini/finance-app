// Barra de abas própria do app (Módulo 19a), usada pela prop "tabBar" do Tabs.
//
// O que ela faz de diferente da barra padrão do React Navigation:
// - uma "bolha" (pílula) desliza por trás do ícone da aba ativa, com mola;
// - o ícone ativo cresce um pouco (1,1) e troca para a cor de acento junto com
//   a chegada da bolha;
// - uma vibração leve acompanha a troca de aba.
//
// O que ela NÃO muda: quem sabe quais são as abas, os títulos e os ícones é o
// Tabs (em app/(abas)/_layout.tsx). Esta barra só lê isso de "descriptors" e
// desenha. Trocar de aba continua sendo feito pelo Router (navigation.navigate).
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESCALA_ICONE_ATIVO, MOLA_SUAVE } from '@/movimento';
import { cantos, cores, textos } from '@/tema';
import { vibrarSelecao } from '@/vibrar';

// Medidas da barra (a altura de 64 mais a área segura é a do guia, seção 7)
const ALTURA_DA_BARRA = 64;
const LARGURA_DA_BOLHA = 56;
const ALTURA_DA_BOLHA = 32;
const TOPO_DA_BOLHA = 8;
const TAMANHO_DO_ICONE = 24;

type AbaProps = {
  titulo: string;
  ativa: boolean;
  // Desenha o ícone na cor pedida (vem do tabBarIcon de cada tela)
  icone: (cor: string) => ReactNode;
  aoTocar: () => void;
};

// Uma aba: ícone + rótulo. "progresso" vai de 0 (inativa) a 1 (ativa) por mola,
// e tudo (escala, cor do ícone, cor do rótulo) sai dele, então os três andam
// juntos e chegam junto com a bolha (mesma mola, MOLA_SUAVE).
function Aba({ titulo, ativa, icone, aoTocar }: AbaProps) {
  const progresso = useSharedValue(ativa ? 1 : 0);

  useEffect(() => {
    progresso.value = withSpring(ativa ? 1 : 0, MOLA_SUAVE);
  }, [ativa, progresso]);

  // O ícone é uma fonte (não aceita cor animada). Por isso há dois ícones
  // empilhados, um cinza e um roxo, e a opacidade troca de um para o outro.
  const estiloDoIconeAtivo = useAnimatedStyle(() => ({
    opacity: interpolate(progresso.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const estiloDoIconeInativo = useAnimatedStyle(() => ({
    opacity: interpolate(progresso.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const estiloDaEscala = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progresso.value, [0, 1], [1, ESCALA_ICONE_ATIVO]) }],
  }));
  // Texto aceita cor animada
  const estiloDoRotulo = useAnimatedStyle(() => ({
    color: interpolateColor(progresso.value, [0, 1], [cores.textoSecundario, cores.acento]),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={titulo}
      accessibilityState={{ selected: ativa }}
      onPress={aoTocar}
      style={styles.aba}
    >
      <Animated.View style={[styles.areaDoIcone, estiloDaEscala]}>
        <Animated.View style={[styles.camadaDoIcone, estiloDoIconeInativo]}>
          {icone(cores.textoSecundario)}
        </Animated.View>
        <Animated.View style={[styles.camadaDoIcone, estiloDoIconeAtivo]}>
          {icone(cores.acento)}
        </Animated.View>
      </Animated.View>
      {/* Fonte do estilo "rotulo"; a cor vem da animação */}
      <Animated.Text style={[textos.rotulo, estiloDoRotulo]}>{titulo}</Animated.Text>
    </Pressable>
  );
}

export default function BarraDeAbas({ state, descriptors, navigation }: BottomTabBarProps) {
  // Área segura de baixo (barra de gestos / botões do Android): a barra cresce
  // esse tanto e o conteúdo sobe, para nada ficar escondido atrás deles.
  const insets = useSafeAreaInsets();

  // Largura da linha de abas, medida na tela (onLayout). Cada aba ocupa a
  // mesma fatia (flex: 1), então a posição da bolha sai de largura / abas.
  const [largura, setLargura] = useState(0);
  const posicao = useSharedValue(0);
  // A primeira posição é direta (sem mola); senão a bolha sairia do canto
  // esquerdo ao abrir o app
  const jaPosicionou = useRef(false);

  const quantidade = state.routes.length;
  const larguraDaAba = quantidade > 0 ? largura / quantidade : 0;
  // Centro da aba ativa, menos metade da bolha
  const alvo = state.index * larguraDaAba + (larguraDaAba - LARGURA_DA_BOLHA) / 2;

  useEffect(() => {
    if (largura === 0) {
      return;
    }
    if (!jaPosicionou.current) {
      posicao.value = alvo;
      jaPosicionou.current = true;
    } else {
      posicao.value = withSpring(alvo, MOLA_SUAVE);
    }
  }, [alvo, largura, posicao]);

  const estiloDaBolha = useAnimatedStyle(() => ({
    transform: [{ translateX: posicao.value }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.barra,
        { height: ALTURA_DA_BARRA + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.linha} onLayout={(evento) => setLargura(evento.nativeEvent.layout.width)}>
        {/* Só desenho: fica atrás das abas (vem antes na ordem) e não recebe toque */}
        <Animated.View
          style={[styles.bolha, { opacity: largura > 0 ? 1 : 0 }, estiloDaBolha]}
        />
        {state.routes.map((rota, indice) => {
          const { options } = descriptors[rota.key];
          const titulo = options.title ?? rota.name;
          const ativa = state.index === indice;

          function aoTocar() {
            // Avisa o Router do toque; quem escuta pode cancelar (preventDefault)
            const evento = navigation.emit({
              type: 'tabPress',
              target: rota.key,
              canPreventDefault: true,
            });
            if (!ativa && !evento.defaultPrevented) {
              vibrarSelecao();
              navigation.navigate(rota.name, rota.params);
            }
          }

          return (
            <Aba
              key={rota.key}
              titulo={titulo}
              ativa={ativa}
              icone={(cor) =>
                options.tabBarIcon?.({ focused: ativa, color: cor, size: TAMANHO_DO_ICONE })
              }
              aoTocar={aoTocar}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    backgroundColor: cores.superficie,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  linha: {
    flex: 1,
    flexDirection: 'row',
  },
  aba: {
    flex: 1,
    alignItems: 'center',
    paddingTop: TOPO_DA_BOLHA,
  },
  areaDoIcone: {
    width: LARGURA_DA_BOLHA,
    height: ALTURA_DA_BOLHA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camadaDoIcone: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolha: {
    position: 'absolute',
    top: TOPO_DA_BOLHA,
    left: 0,
    pointerEvents: 'none',
    width: LARGURA_DA_BOLHA,
    height: ALTURA_DA_BOLHA,
    borderRadius: cantos.botao,
    backgroundColor: cores.superficieElevada,
  },
});
