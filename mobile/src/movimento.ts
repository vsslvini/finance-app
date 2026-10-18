// Animações de entrada compartilhadas (seção 10 do guia de design). Ficam num
// lugar só para as telas não repetirem números de duração e de atraso.
import { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

// Entrada em cascata: cada bloco entra 40 ms depois do anterior
const ATRASO_POR_BLOCO = 40;
// Passando de 6 blocos a cascata ficaria longa; os demais aparecem já no lugar
const MAXIMO_DE_BLOCOS = 6;
// De onde o bloco sobe, em pontos
const SUBIDA = 8;

// Para a prop "entering" de um Animated.View. "indice" é a posição do bloco na
// tela (0 é o primeiro). Sem .reduceMotion(), vale o padrão do Reanimated 4
// (ReduceMotion.System): com "reduzir movimento" ligado, a entrada é pulada.
export function entradaEmCascata(indice: number) {
  if (indice >= MAXIMO_DE_BLOCOS) {
    return undefined;
  }
  return FadeInDown.delay(indice * ATRASO_POR_BLOCO)
    .duration(200)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ opacity: 0, translateY: SUBIDA });
}

// Troca de mês (Transações e Relatório): o conteúdo novo aparece com um fade
// curto; as setas e o título ficam parados
export const ENTRADA_DO_CONTEUDO = FadeIn.duration(150).easing(Easing.out(Easing.cubic));
