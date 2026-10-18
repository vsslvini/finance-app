// Barra de progresso do guia de design ("Bloco de meta"): um trilho cinza
// (diaFuturo) com a parte roxa (acento) por cima, do tamanho da porcentagem.
// Usada na seção Guardado (plano de guardar) e nas categorias do Relatório.
// Ao aparecer, a parte roxa enche de 0 até o valor (seção 10 do guia).
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { cores } from '@/tema';

// Altura da barra (docs/design.md, "Bloco de meta")
const ALTURA_DA_BARRA = 8;

// Seção 10 do guia: a barra enche em 500 ms, desacelerando no fim
const DURACAO_DO_ENCHIMENTO = 500;

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

  // Fração desenhada (0 a 1). Começa em 0 só na primeira vez; quando o valor
  // muda depois, a animação parte de onde a barra está, sem voltar a zero
  const fracao = useSharedValue(0);

  // useEffect porque iniciar uma animação é um efeito (acontece depois do
  // primeiro desenho e a cada mudança de valor, não dá para calcular na
  // renderização). Com "reduzir movimento" ligado, o withTiming (que segue
  // ReduceMotion.System por padrão) já salta direto para o valor final.
  useEffect(() => {
    fracao.value = withTiming(limitada / 100, {
      duration: DURACAO_DO_ENCHIMENTO,
      easing: Easing.out(Easing.cubic),
    });
  }, [fracao, limitada]);

  // A barra roxa tem sempre a largura inteira do trilho e é só encolhida com
  // scaleX, que é mais barato que animar a largura (não refaz o layout).
  // A origem fica à esquerda (transformOrigin no estilo abaixo)
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scaleX: fracao.value }],
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={rotulo}
      // Valor real desde o primeiro quadro, não o da animação em andamento
      accessibilityValue={{ min: 0, max: 100, now: porcentagem }}
      style={styles.trilho}
    >
      <Animated.View style={[styles.preenchido, estiloAnimado]} />
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    height: ALTURA_DA_BARRA,
    borderRadius: ALTURA_DA_BARRA / 2,
    backgroundColor: cores.diaFuturo,
    // Corta a parte roxa nos cantos arredondados do trilho
    overflow: 'hidden',
  },
  preenchido: {
    height: ALTURA_DA_BARRA,
    backgroundColor: cores.acento,
    // Sem isso o scaleX encolheria para o centro; assim cresce da esquerda
    transformOrigin: 'left center',
  },
});
