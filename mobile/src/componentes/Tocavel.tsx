// Pressable com resposta ao toque animada: ao apertar, o bloco encolhe para
// 0,97 com uma mola curta e a opacidade vai a 0,85; ao soltar, volta. Antes a
// troca era imediata (toque.apertado em tema.ts); agora a mola dá a sensação de
// "botão que cede". Serve ao Botao e aos cartões tocáveis.
//
// O style é fixo (não aceita função com "pressed"), porque quem anima aqui é o
// Reanimated, rodando fora do JavaScript, sem precisar redesenhar o componente.
import type { ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ESCALA_APERTADA, MOLA_TOQUE } from '@/movimento';

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

// Mesma opacidade do toque.apertado antigo
const OPACIDADE_APERTADA = 0.85;

type TocavelProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  // Opacidade quando ninguém aperta (o Botao desativado usa 0,7)
  opacidadeEmRepouso?: number;
};

export default function Tocavel({
  style,
  children,
  opacidadeEmRepouso = 1,
  onPressIn,
  onPressOut,
  ...resto
}: TocavelProps) {
  // 0 = solto, 1 = apertado. A mola leva este número; o estilo é calculado a
  // partir dele.
  const aperto = useSharedValue(0);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: interpolate(aperto.value, [0, 1], [opacidadeEmRepouso, OPACIDADE_APERTADA]),
    transform: [{ scale: interpolate(aperto.value, [0, 1], [1, ESCALA_APERTADA]) }],
  }));

  function aoApertar(evento: GestureResponderEvent) {
    aperto.set(withSpring(1, MOLA_TOQUE));
    onPressIn?.(evento);
  }

  function aoSoltar(evento: GestureResponderEvent) {
    aperto.set(withSpring(0, MOLA_TOQUE));
    onPressOut?.(evento);
  }

  return (
    <PressableAnimado
      {...resto}
      onPressIn={aoApertar}
      onPressOut={aoSoltar}
      style={[style, estiloAnimado]}
    >
      {children}
    </PressableAnimado>
  );
}
