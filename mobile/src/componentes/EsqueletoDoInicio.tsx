// Estado "carregando" da tela Início: blocos cinza com o formato da tela
// (título, número grande, régua, dois pares de cartões) que pulsam de leve, e
// a frase "Carregando o resumo..." embaixo. Os blocos são só desenho e ficam
// escondidos do leitor de tela; a frase é o que ele lê.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cantos, cores, espaco, textos } from '@/tema';

// Seção 10 do guia: o pulso vai de 0,5 a 1 de opacidade em 900 ms
const OPACIDADE_MINIMA = 0.5;
const DURACAO_DO_PULSO = 900;

export default function EsqueletoDoInicio() {
  const opacidade = useSharedValue(1);

  // useEffect porque iniciar uma animação é um efeito (acontece depois do
  // primeiro desenho). Com "reduzir movimento" ligado no celular, o withTiming
  // do Reanimated 4 já vai direto ao valor final (ReduceMotion.System é o
  // padrão), então não precisamos do useReducedMotion (que, além disso, não
  // existe na versão simulada do Reanimated usada pelo teste de rotas).
  // Ao sair da tela, a animação é cancelada para não ficar rodando à toa.
  useEffect(() => {
    // -1 repete sem parar; true faz ir e voltar (1 até 0,5 e de volta a 1)
    opacidade.value = withRepeat(
      withTiming(OPACIDADE_MINIMA, {
        duration: DURACAO_DO_PULSO,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(opacidade);
  }, [opacidade]);

  const estiloDoPulso = useAnimatedStyle(() => ({ opacity: opacidade.value }));

  return (
    <View style={styles.tela}>
      <Animated.View
        // Só desenho: o leitor de tela pula tudo isto
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.blocos, estiloDoPulso]}
      >
        <View style={styles.titulo} />
        <View style={styles.numero} />
        <View style={styles.regua} />
        <View style={styles.linha}>
          <View style={styles.cartao} />
          <View style={styles.cartao} />
        </View>
        <View style={styles.linha}>
          <View style={styles.cartao} />
          <View style={styles.cartao} />
        </View>
      </Animated.View>
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
