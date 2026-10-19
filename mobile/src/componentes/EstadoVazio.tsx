// Estado vazio de uma lista: um ícone de traço fino acima do texto. O ícone é só
// desenho, então fica escondido do leitor de tela (o texto já diz tudo). Quem
// usa decide o cartão em volta; este componente só desenha o ícone e a frase.
//
// Com "animacao" (Módulo 19b), no lugar do ícone aparece a animação Lottie
// "vazio" (uma moeda que flutua). Ela entra só nos vazios principais (aba A
// pagar sem dívidas e Transações sem itens), para não virar enfeite em tudo.
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

import AnimacaoLottie from '@/componentes/AnimacaoLottie';
import { DURACAO_RESPIRO, useMovimentoReduzido } from '@/movimento';
import { cores, espaco, textos } from '@/tema';

type EstadoVazioProps = {
  icone: LucideIconName; // ex.: "receipt"
  texto: string; // ex.: "Nenhum gasto neste mês ainda."
  // true troca o ícone pela animação Lottie "vazio" (o ícone continua
  // obrigatório para quem não usa a animação)
  animacao?: boolean;
};

// O ícone "respira": escala de 1 a 1,06 e opacidade de 1 a 0,7, num vaivém
// lento (2,4 s para ir e voltar). É um loop sutil, só para o estado vazio não
// parecer uma tela travada.
const ESCALA_DO_RESPIRO = 1.06;
const OPACIDADE_DO_RESPIRO = 0.7;

// A animação é maior que o ícone (40), porque a moeda tem margem em volta para
// flutuar e para a sombra embaixo
const TAMANHO_DA_ANIMACAO = 72;

export default function EstadoVazio({ icone, texto, animacao = false }: EstadoVazioProps) {
  const respiro = useSharedValue(0);
  const movimentoReduzido = useMovimentoReduzido();

  useEffect(() => {
    // Com "reduzir movimento" ligado, o loop nem começa: o ícone fica parado.
    // Com a animação Lottie, o respiro também não roda (ela já se mexe sozinha)
    if (movimentoReduzido || animacao) {
      respiro.set(0);
      return;
    }
    // -1 repete sem parar; true faz ir e voltar. Metade da duração para cada
    // sentido, então o ciclo completo dura DURACAO_RESPIRO
    respiro.set(
      withRepeat(
        withTiming(1, { duration: DURACAO_RESPIRO / 2, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    // Ao sair da tela, cancela o loop para não rodar à toa
    return () => cancelAnimation(respiro);
  }, [animacao, movimentoReduzido, respiro]);

  const estiloDoRespiro = useAnimatedStyle(() => ({
    opacity: interpolate(respiro.value, [0, 1], [1, OPACIDADE_DO_RESPIRO]),
    transform: [{ scale: interpolate(respiro.value, [0, 1], [1, ESCALA_DO_RESPIRO]) }],
  }));

  return (
    <View style={styles.area}>
      {animacao ? (
        // A AnimacaoLottie já se esconde do leitor de tela e para com
        // "reduzir movimento"
        <AnimacaoLottie animacao="vazio" tamanho={TAMANHO_DA_ANIMACAO} />
      ) : (
        <Animated.View style={estiloDoRespiro}>
          <Lucide
            name={icone}
            size={40}
            color={cores.textoTerciario}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Animated.View>
      )}
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
