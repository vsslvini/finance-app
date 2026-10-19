// Animações de entrada compartilhadas (seção 10 do guia de design). Ficam num
// lugar só para as telas não repetirem números de duração e de atraso.
import * as Reanimated from 'react-native-reanimated';
import { Easing, FadeIn, FadeInDown, type WithSpringConfig } from 'react-native-reanimated';

// Molas (Módulo 19). "damping" alto e "mass" 1 dão uma mola que chega ao
// destino sem quique visível: ela só desacelera de um jeito mais natural que
// uma curva fixa. Sem .reduceMotion(), vale o padrão do Reanimated 4
// (ReduceMotion.System): com "reduzir movimento" ligado, a mola vai direto ao
// valor final.
// Mola suave: a bolha da barra de abas e a escala do ícone ativo
export const MOLA_SUAVE: WithSpringConfig = { damping: 22, stiffness: 260, mass: 1 };
// Mola de toque: curta e firme, para o aperto de botões e cartões
export const MOLA_TOQUE: WithSpringConfig = { damping: 24, stiffness: 520, mass: 0.8 };

// Escalas usadas nas animações de toque e de destaque
export const ESCALA_APERTADA = 0.97;
export const ESCALA_ICONE_ATIVO = 1.1;

// Durações nomeadas, em ms (nada de entrada passa de 500; só os loops)
export const DURACAO_CURTA = 150;
export const DURACAO_MEDIA = 250;
export const DURACAO_LONGA = 500;
// Loops contínuos e sutis (respirar e brilho do esqueleto)
export const DURACAO_RESPIRO = 2400;
export const DURACAO_BRILHO = 1400;

// "Reduzir movimento" ligado no celular? O useReducedMotion existe no
// Reanimated de verdade, mas não na versão simulada usada pelo Jest (anotado
// no CLAUDE.md, 2026-10-18). Lemos por fora do import tipado e, se não existir,
// devolvemos false. A escolha acontece uma vez só, quando o módulo carrega,
// então a ordem dos hooks nunca muda entre desenhos.
type UsarMovimentoReduzido = () => boolean;
const hookDoReanimated = (Reanimated as { useReducedMotion?: UsarMovimentoReduzido })
  .useReducedMotion;
export const useMovimentoReduzido: UsarMovimentoReduzido = hookDoReanimated ?? (() => false);

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
