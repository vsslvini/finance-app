// Barra de progresso do guia de design ("Bloco de meta"): um trilho cinza
// (diaFuturo) com a parte roxa (acento) por cima, do tamanho da porcentagem.
// Usada na seção Guardado (plano de guardar), nas dívidas, no "Por mês" e nas
// categorias do Relatório.
//
// Desde o Módulo 19b a parte roxa é uma linha SVG de pontas redondas que "se
// desenha" da esquerda até o valor (seção 10 do guia). O truque é o tracejado
// (strokeDasharray): a linha vira um traço do comprimento dela seguido de um
// buraco do mesmo tamanho. O strokeDashoffset empurra esse desenho para trás:
// com o empurrão igual ao comprimento, só o buraco aparece (nada desenhado);
// com o empurrão em zero, o traço inteiro aparece. Animar o empurrão faz a
// linha crescer, como se alguém a desenhasse.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { DURACAO_LONGA } from '@/movimento';
import { cores } from '@/tema';

// A Line do SVG não sabe animar sozinha: o createAnimatedComponent cria uma
// versão que aceita "animatedProps" (props que o Reanimated muda a cada quadro,
// fora do JavaScript, sem redesenhar o componente)
const LinhaAnimada = Animated.createAnimatedComponent(Line);

// Altura da barra (docs/design.md, "Bloco de meta")
const ALTURA_DA_BARRA = 8;

type BarraDeProgressoProps = {
  porcentagem: number; // inteiro, ex.: 37; pode passar de 100 no plano de guardar
  // Nome lido pelo leitor de tela (ex.: "Progresso do plano de guardar").
  // Opcional: nas categorias do Relatório, a linha inteira já tem um rótulo
  rotulo?: string;
};

export default function BarraDeProgresso({ porcentagem, rotulo }: BarraDeProgressoProps) {
  // A parte roxa nunca passa da largura do trilho, mesmo acima de 100. O
  // leitor de tela recebe o número de verdade (now), sem esse limite
  const limitada = Math.max(0, Math.min(porcentagem, 100));

  // O tracejado precisa do comprimento em pontos, então medimos a largura do
  // trilho na tela (onLayout). Antes da medida (e nos testes, onde não há
  // layout), só o trilho aparece.
  const [largura, setLargura] = useState(0);
  const medida = largura > 0;

  // A linha vai do centro da ponta esquerda ao centro da ponta direita: a
  // ponta redonda acrescenta meia altura de cada lado, então a barra cheia
  // ocupa exatamente a largura do trilho
  const meiaAltura = ALTURA_DA_BARRA / 2;
  const comprimento = Math.max(largura - ALTURA_DA_BARRA, 0);

  // Fração desenhada (0 a 1). Começa em 0 só na primeira vez; quando o valor
  // muda depois, a animação parte de onde a barra está, sem voltar a zero
  const fracao = useSharedValue(0);

  // useEffect porque iniciar uma animação é um efeito (acontece depois do
  // desenho). Espera a medida, para a linha não começar "no meio" do caminho.
  // Com "reduzir movimento" ligado, o withTiming (que segue
  // ReduceMotion.System por padrão) salta direto para o valor final.
  useEffect(() => {
    if (!medida) {
      return;
    }
    fracao.value = withTiming(limitada / 100, {
      duration: DURACAO_LONGA,
      easing: Easing.out(Easing.cubic),
    });
  }, [fracao, limitada, medida]);

  const propsAnimadas = useAnimatedProps(() => ({
    strokeDashoffset: comprimento * (1 - fracao.value),
    // Em 0% a linha some de vez: um traço de comprimento zero com ponta
    // redonda ainda desenharia uma bolinha roxa
    strokeOpacity: fracao.value > 0.005 ? 1 : 0,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={rotulo}
      // Valor real desde o primeiro quadro, não o da animação em andamento
      accessibilityValue={{ min: 0, max: 100, now: porcentagem }}
      onLayout={(evento) => setLargura(evento.nativeEvent.layout.width)}
      style={styles.trilho}
    >
      {medida && (
        <Svg width={largura} height={ALTURA_DA_BARRA}>
          <LinhaAnimada
            x1={meiaAltura}
            y1={meiaAltura}
            x2={meiaAltura + comprimento}
            y2={meiaAltura}
            stroke={cores.acento}
            strokeWidth={ALTURA_DA_BARRA}
            strokeLinecap="round"
            // Um traço do tamanho da linha e um buraco do mesmo tamanho
            strokeDasharray={[comprimento, comprimento]}
            animatedProps={propsAnimadas}
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    height: ALTURA_DA_BARRA,
    borderRadius: ALTURA_DA_BARRA / 2,
    backgroundColor: cores.diaFuturo,
    // Garante que nada passe dos cantos arredondados do trilho
    overflow: 'hidden',
  },
});
