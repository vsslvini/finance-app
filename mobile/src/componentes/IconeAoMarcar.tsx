// Embrulho do ícone de situação (Módulo 19b): quando algo passa de "não pago"
// para "pago", o ícone dá um pequeno giro e cresce até o tamanho normal, com
// uma mola curta. Serve à linha do gasto fixo e à linha da parcela.
//
// Como sabe que "acabou de marcar": guarda o valor anterior de "marcado" num
// ref e compara dentro do useEffect, depois de desenhar. Assim, uma linha que
// já chega paga (ao abrir a tela) não anima; só a mudança anima.
import { useEffect, useRef, type ReactNode } from 'react';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MOLA_TOQUE } from '@/movimento';

// De onde o ícone parte: girado 45 graus para trás e com 60% do tamanho. Nunca
// some (opacidade fica 1), então a situação está à vista desde o primeiro quadro
const GIRO_INICIAL = -45;
const ESCALA_INICIAL = 0.6;

type IconeAoMarcarProps = {
  marcado: boolean; // true quando está pago
  children: ReactNode; // o ícone (Lucide ou a animação de sucesso)
};

export default function IconeAoMarcar({ marcado, children }: IconeAoMarcarProps) {
  // 0 = posição de partida (girado e menor), 1 = parado no lugar. Começa em 1:
  // sem mudança, o ícone fica quieto
  const pulo = useSharedValue(1);
  const marcadoAntes = useRef(marcado);

  useEffect(() => {
    const acabouDeMarcar = marcado && !marcadoAntes.current;
    marcadoAntes.current = marcado;
    if (!acabouDeMarcar) {
      return;
    }
    // Pula para a partida sem animar (duração 0) e volta com a mola. A
    // MOLA_TOQUE tem um quique pequeno, que dá o "estalo" do check. Com
    // "reduzir movimento", a mola vai direto ao fim (ReduceMotion.System)
    pulo.set(withSequence(withTiming(0, { duration: 0 }), withSpring(1, MOLA_TOQUE)));
  }, [marcado, pulo]);

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(pulo.value, [0, 1], [GIRO_INICIAL, 0])}deg` },
      { scale: interpolate(pulo.value, [0, 1], [ESCALA_INICIAL, 1]) },
    ],
  }));

  return <Animated.View style={estilo}>{children}</Animated.View>;
}
