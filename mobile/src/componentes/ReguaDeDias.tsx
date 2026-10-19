// Régua de dias do mês: uma linha do primeiro ao último dia, com a parte que
// já passou em roxo escuro e uma marca roxa no dia de hoje. Embaixo, o mesmo
// dado em texto ("dia 12 de 31"), que é o que o leitor de tela lê.
//
// Desde o Módulo 19b a régua é um desenho SVG (antes era um traço por dia).
// Ao aparecer, a parte roxa "se desenha" do dia 1 até hoje e a marca de hoje
// vai junto com a ponta da linha. O truque do desenho (strokeDasharray e
// strokeDashoffset) está explicado na BarraDeProgresso.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { DURACAO_LONGA } from '@/movimento';
import { cores, espaco, textos } from '@/tema';

// Versões animáveis das formas do SVG (aceitam "animatedProps")
const LinhaAnimada = Animated.createAnimatedComponent(Line);
const CirculoAnimado = Animated.createAnimatedComponent(Circle);

// Altura da régua (a mesma da régua antiga), espessura da linha e o raio da
// marca de hoje. A marca tem um contorno da cor do fundo, que a separa da linha
const ALTURA_DA_REGUA = 18;
const ESPESSURA_DA_LINHA = 6;
const RAIO_DE_HOJE = 6;
const CONTORNO_DE_HOJE = 2;
// Folga nas pontas, para a marca caber inteira no dia 1 e no último dia
const FOLGA = RAIO_DE_HOJE + CONTORNO_DE_HOJE;

type ReguaDeDiasProps = {
  diaDoMes: number;
  diasNoMes: number;
};

export default function ReguaDeDias({ diaDoMes, diasNoMes }: ReguaDeDiasProps) {
  // Quanto do mês já foi, de 0 a 1 (dia 31 de 31 = a linha inteira)
  const fracaoDeHoje = diasNoMes > 0 ? Math.max(0, Math.min(diaDoMes / diasNoMes, 1)) : 0;

  // O desenho precisa da largura em pontos, medida na tela (onLayout). Antes
  // da medida (e nos testes, onde não há layout), só o texto aparece
  const [largura, setLargura] = useState(0);
  const medida = largura > 0;
  const centro = ALTURA_DA_REGUA / 2;
  const inicio = FOLGA;
  const comprimento = Math.max(largura - 2 * FOLGA, 0);

  // Quanto da linha está desenhado, de 0 a 1. Sobe até a fração de hoje
  const desenhado = useSharedValue(0);

  // useEffect porque iniciar uma animação é um efeito. Espera a medida, para a
  // linha começar do dia 1. Com "reduzir movimento" ligado, o withTiming
  // (ReduceMotion.System, o padrão) vai direto ao dia de hoje.
  useEffect(() => {
    if (!medida) {
      return;
    }
    desenhado.value = withTiming(fracaoDeHoje, {
      duration: DURACAO_LONGA,
      easing: Easing.out(Easing.cubic),
    });
  }, [desenhado, fracaoDeHoje, medida]);

  // A parte que já passou: o tracejado mostra só "desenhado" da linha
  const propsDaLinha = useAnimatedProps(() => ({
    strokeDashoffset: comprimento * (1 - desenhado.value),
  }));
  // A marca de hoje anda junto com a ponta da linha
  const propsDaMarca = useAnimatedProps(() => ({
    cx: inicio + comprimento * desenhado.value,
  }));

  return (
    <View style={styles.bloco}>
      {/* A régua é só desenho: o leitor de tela lê o texto de baixo */}
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onLayout={(evento) => setLargura(evento.nativeEvent.layout.width)}
        style={styles.regua}
      >
        {medida && (
          <Svg width={largura} height={ALTURA_DA_REGUA}>
            {/* O mês inteiro, nos dias que faltam */}
            <Line
              x1={inicio}
              y1={centro}
              x2={inicio + comprimento}
              y2={centro}
              stroke={cores.diaFuturo}
              strokeWidth={ESPESSURA_DA_LINHA}
              strokeLinecap="round"
            />
            {/* Os dias que já passaram, desenhados por cima até hoje */}
            <LinhaAnimada
              x1={inicio}
              y1={centro}
              x2={inicio + comprimento}
              y2={centro}
              stroke={cores.diaPassado}
              strokeWidth={ESPESSURA_DA_LINHA}
              strokeLinecap="round"
              strokeDasharray={[comprimento, comprimento]}
              animatedProps={propsDaLinha}
            />
            {/* Hoje */}
            <CirculoAnimado
              cy={centro}
              r={RAIO_DE_HOJE}
              fill={cores.diaHoje}
              stroke={cores.fundo}
              strokeWidth={CONTORNO_DE_HOJE}
              animatedProps={propsDaMarca}
            />
          </Svg>
        )}
      </View>
      <Text style={textos.detalhe}>{`dia ${diaDoMes} de ${diasNoMes}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    gap: espaco.pequeno,
  },
  regua: {
    // A altura fica reservada antes da medida, para nada pular quando o
    // desenho aparece
    height: ALTURA_DA_REGUA,
  },
});
