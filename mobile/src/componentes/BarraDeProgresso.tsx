// Barra de progresso do guia de design ("Bloco de meta"): um trilho cinza
// (diaFuturo) com a parte roxa (acento) por cima, do tamanho da porcentagem.
// Usada na seção Guardado (plano de guardar) e nas categorias do Relatório.
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { cores } from '@/tema';

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
  const largura: DimensionValue = `${limitada}%`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={rotulo}
      accessibilityValue={{ min: 0, max: 100, now: porcentagem }}
      style={styles.trilho}
    >
      <View style={[styles.preenchido, { width: largura }]} />
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
  },
});
