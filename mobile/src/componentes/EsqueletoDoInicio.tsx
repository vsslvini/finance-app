// Estado "carregando" da tela Início: blocos cinza com o formato da tela
// (título, número grande, régua, dois pares de cartões) por onde passa um brilho
// (shimmer) em loop, e a frase "Carregando o resumo..." embaixo. Os blocos são
// só desenho e ficam escondidos do leitor de tela; a frase é o que ele lê.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { DURACAO_BRILHO, useMovimentoReduzido } from '@/movimento';
import { cantos, cores, espaco, textos } from '@/tema';

// A faixa de brilho tem esta fração da largura do bloco
const LARGURA_DO_BRILHO = 0.6;

type BlocoProps = {
  style: StyleProp<ViewStyle>;
  // 0 a 1: onde o brilho está na passada (compartilhado por todos os blocos,
  // para a passada acontecer ao mesmo tempo em todos)
  progresso: SharedValue<number>;
};

// Um bloco cinza com a faixa de brilho dentro. O overflow "hidden" corta a faixa
// nas bordas arredondadas do bloco. A largura do bloco é medida com onLayout,
// porque a faixa precisa andar do lado de fora esquerdo ao lado de fora direito.
function Bloco({ style, progresso }: BlocoProps) {
  const [largura, setLargura] = useState(0);
  const larguraDaFaixa = largura * LARGURA_DO_BRILHO;

  const estiloDaFaixa = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progresso.value, [0, 1], [-larguraDaFaixa, largura]) }],
  }));

  return (
    <View
      onLayout={(evento) => setLargura(evento.nativeEvent.layout.width)}
      style={[style, styles.recorte]}
    >
      <Animated.View style={[styles.faixa, { width: larguraDaFaixa }, estiloDaFaixa]}>
        {/* Das duas pontas na cor do bloco até um cinza mais claro no meio:
            sem transparência, a faixa some nas bordas sem corte visível */}
        <LinearGradient
          colors={[cores.superficie, cores.borda, cores.superficie]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export default function EsqueletoDoInicio() {
  const progresso = useSharedValue(0);
  const movimentoReduzido = useMovimentoReduzido();

  // useEffect porque iniciar uma animação é um efeito (acontece depois do
  // primeiro desenho). Com "reduzir movimento" ligado, o loop nem começa e os
  // blocos ficam cinza e parados. Ao sair da tela, a animação é cancelada.
  useEffect(() => {
    if (movimentoReduzido) {
      progresso.value = 0;
      return;
    }
    // -1 repete sem parar; false recomeça do início a cada passada (o brilho
    // sempre anda da esquerda para a direita)
    progresso.value = withRepeat(
      withTiming(1, { duration: DURACAO_BRILHO, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(progresso);
  }, [movimentoReduzido, progresso]);

  return (
    <View style={styles.tela}>
      <View
        // Só desenho: o leitor de tela pula tudo isto
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.blocos}
      >
        <Bloco style={styles.titulo} progresso={progresso} />
        <Bloco style={styles.numero} progresso={progresso} />
        <Bloco style={styles.regua} progresso={progresso} />
        <View style={styles.linha}>
          <Bloco style={styles.cartao} progresso={progresso} />
          <Bloco style={styles.cartao} progresso={progresso} />
        </View>
        <View style={styles.linha}>
          <Bloco style={styles.cartao} progresso={progresso} />
          <Bloco style={styles.cartao} progresso={progresso} />
        </View>
      </View>
      <Text style={[textos.corpo, styles.texto]}>Carregando o resumo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    padding: espaco.grande,
    gap: espaco.maior,
  },
  blocos: {
    gap: espaco.medio,
  },
  recorte: {
    // Corta o brilho nos cantos arredondados do bloco
    overflow: 'hidden',
  },
  faixa: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  titulo: {
    width: 120,
    height: 14,
    borderRadius: cantos.aviso,
    backgroundColor: cores.superficie,
  },
  numero: {
    width: 200,
    height: 46,
    borderRadius: cantos.aviso,
    backgroundColor: cores.superficie,
  },
  regua: {
    height: 32,
    borderRadius: cantos.aviso,
    backgroundColor: cores.superficie,
  },
  linha: {
    flexDirection: 'row',
    gap: espaco.medio,
  },
  cartao: {
    flex: 1,
    height: 76,
    borderRadius: cantos.cartao,
    backgroundColor: cores.superficie,
  },
  texto: {
    color: cores.textoSecundario,
    textAlign: 'center',
  },
});
