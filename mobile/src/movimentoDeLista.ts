// Movimento das listas (Módulo 19b): o que acontece quando uma linha muda de
// lugar ou some. Fica separado de movimento.ts só para os dois trabalhos do
// 19b não mexerem no mesmo arquivo ao mesmo tempo; dá para juntar depois.
//
// Por que existe: sem isto, quando um gasto fixo ou uma dívida é apagado, a
// linha some de repente e as de baixo "pulam" para cima. Com isto, a linha
// esmaece e as outras deslizam até o lugar novo.
import { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';

import { DURACAO_CURTA, DURACAO_MEDIA } from '@/movimento';

// Para a prop "layout" de um Animated.View (ou "itemLayoutAnimation" de um
// Animated.FlatList): quando o bloco muda de posição ou de tamanho, ele desliza
// do lugar antigo ao novo em 250 ms, desacelerando no fim. Sem .reduceMotion(),
// vale o padrão do Reanimated 4 (ReduceMotion.System): com "reduzir movimento"
// ligado, o bloco vai direto ao lugar novo.
export const TRANSICAO_DE_LISTA = LinearTransition.duration(DURACAO_MEDIA).easing(
  Easing.out(Easing.cubic),
);

// Para a prop "exiting": a linha removida esmaece em 150 ms, acelerando
// (curva de saída do guia, seção 10). Também pulada com "reduzir movimento".
export const SAIDA_DE_LISTA = FadeOut.duration(DURACAO_CURTA).easing(Easing.in(Easing.cubic));
