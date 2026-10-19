// Anel de progresso em SVG (Módulo 19b): um círculo de fundo e, por cima, um
// arco roxo que "se desenha" do zero até a porcentagem, no sentido do relógio,
// começando no topo. No meio fica um texto pronto (o número não anima).
//
// Como o arco se desenha: o contorno do círculo vira um tracejado com um traço
// do tamanho do círculo inteiro (strokeDasharray) e o strokeDashoffset empurra
// esse traço para fora. Offset igual à circunferência: nada aparece; offset 0:
// o círculo todo. O Reanimated anima o offset fora do JavaScript, pelo
// useAnimatedProps (o jeito de animar props que não são estilo, como as do SVG).
//
// Acessibilidade: o desenho fica escondido do leitor de tela; os textos do meio
// continuam visíveis para ele, então a porcentagem é lida desde o primeiro
// quadro, com o valor real.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { DURACAO_LONGA } from '@/movimento';
import { cores, fontes, textos } from '@/tema';

// O Circle do react-native-svg não sabe receber valores do Reanimated; o
// createAnimatedComponent cria uma versão que sabe
const CirculoAnimado = Animated.createAnimatedComponent(Circle);

// Medidas do anel, em pontos
const TAMANHO = 80;
const ESPESSURA = 7;
// O traço fica centrado na linha do círculo: o raio desconta meia espessura,
// para o anel caber inteiro no quadrado
const RAIO = (TAMANHO - ESPESSURA) / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

type AnelDeProgressoProps = {
  porcentagem: number; // de 0 a 100 (fora disso, o anel fica no limite)
  texto: string; // o número do meio, já formatado (ex.: "38,7%")
  legenda: string; // a linha pequena embaixo do número (ex.: "da renda")
};

export default function AnelDeProgresso({ porcentagem, texto, legenda }: AnelDeProgressoProps) {
  // Fração de 0 a 1 do anel que fica pintada
  const fracao = Math.min(Math.max(porcentagem, 0), 100) / 100;
  // Começa vazio (0) e anda até a fração ao aparecer
  const progresso = useSharedValue(0);

  useEffect(() => {
    // 500 ms desacelerando, como a BarraDeProgresso. Se a porcentagem mudar
    // (ex.: renda nova), o arco anda do ponto atual até o novo. Sem
    // .reduceMotion(), vale ReduceMotion.System: com "reduzir movimento", o
    // arco já aparece no lugar
    progresso.set(withTiming(fracao, { duration: DURACAO_LONGA, easing: Easing.out(Easing.cubic) }));
  }, [fracao, progresso]);

  const propsAnimadas = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUNFERENCIA * (1 - progresso.value),
  }));

  return (
    <View style={styles.area}>
      {/* Só desenho: escondido do leitor de tela. O giro de -90 graus faz o
          arco começar no topo (o círculo do SVG começa às 3 horas) */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.giro}
      >
        <Svg width={TAMANHO} height={TAMANHO}>
          <Circle
            cx={TAMANHO / 2}
            cy={TAMANHO / 2}
            r={RAIO}
            stroke={cores.borda}
            strokeWidth={ESPESSURA}
            fill="none"
          />
          <CirculoAnimado
            cx={TAMANHO / 2}
            cy={TAMANHO / 2}
            r={RAIO}
            stroke={cores.acento}
            strokeWidth={ESPESSURA}
            // Ponta arredondada só quando há o que pintar: com 0%, a ponta
            // redonda desenharia um pontinho roxo sozinho
            strokeLinecap={fracao > 0 ? 'round' : 'butt'}
            strokeDasharray={`${CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
            fill="none"
            animatedProps={propsAnimadas}
          />
        </Svg>
      </View>
      {/* Os textos ficam por cima do desenho, centralizados, sem girar */}
      <View style={styles.meio}>
        <Text style={[textos.rotulo, styles.numero]}>{texto}</Text>
        <Text style={textos.detalhe}>{legenda}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    width: TAMANHO,
    height: TAMANHO,
  },
  giro: {
    transform: [{ rotate: '-90deg' }],
  },
  meio: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {
    fontFamily: fontes.negrito,
    color: cores.texto,
    fontVariant: ['tabular-nums'],
  },
});
