// Estado vazio de uma lista: um ícone de traço fino acima do texto. O ícone é só
// desenho, então fica escondido do leitor de tela (o texto já diz tudo). Quem
// usa decide o cartão em volta; este componente só desenha o ícone e a frase.
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { DURACAO_RESPIRO, useMovimentoReduzido } from '@/movimento';
import { cores, espaco, textos } from '@/tema';

type EstadoVazioProps = {
  icone: LucideIconName; // ex.: "receipt"
  texto: string; // ex.: "Nenhum gasto neste mês ainda."
};

// O ícone "respira": escala de 1 a 1,06 e opacidade de 1 a 0,7, num vaivém
// lento (2,4 s para ir e voltar). É um loop sutil, só para o estado vazio não
// parecer uma tela travada.
const ESCALA_DO_RESPIRO = 1.06;
const OPACIDADE_DO_RESPIRO = 0.7;

export default function EstadoVazio({ icone, texto }: EstadoVazioProps) {
  const respiro = useSharedValue(0);
  const movimentoReduzido = useMovimentoReduzido();

  useEffect(() => {
    // Com "reduzir movimento" ligado, o loop nem começa: o ícone fica parado
    if (movimentoReduzido) {
      respiro.value = 0;
      return;
    }
    // -1 repete sem parar; true faz ir e voltar. Metade da duração para cada
    // sentido, então o ciclo completo dura DURACAO_RESPIRO
    respiro.value = withRepeat(
      withTiming(1, { duration: DURACAO_RESPIRO / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    // Ao sair da tela, cancela o loop para não rodar à toa
    return () => cancelAnimation(respiro);
  }, [movimentoReduzido, respiro]);

  const estiloDoRespiro = useAnimatedStyle(() => ({
    opacity: interpolate(respiro.value, [0, 1], [1, OPACIDADE_DO_RESPIRO]),
    transform: [{ scale: interpolate(respiro.value, [0, 1], [1, ESCALA_DO_RESPIRO]) }],
  }));

  return (
    <View style={styles.area}>
      <Animated.View style={estiloDoRespiro}>
        <Lucide
          name={icone}
          size={40}
          color={cores.textoTerciario}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>
      <Text style={[textos.corpo, styles.texto]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    alignItems: 'center',
    gap: espaco.medio,
  },
  texto: {
    color: cores.textoSecundario,
    textAlign: 'center',
  },
});
