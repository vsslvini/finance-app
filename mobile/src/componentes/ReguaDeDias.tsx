// Régua de dias do mês: um traço por dia, colorido conforme já passou,
// é hoje ou ainda falta. Embaixo, o mesmo dado em texto ("dia 12 de 31").
import { StyleSheet, Text, View } from 'react-native';

import { cores, espaco, textos } from '@/tema';

type ReguaDeDiasProps = {
  diaDoMes: number;
  diasNoMes: number;
};

// Cor do traço de um dia, comparado com hoje
function corDoDia(dia: number, hoje: number): string {
  if (dia < hoje) {
    return cores.diaPassado;
  }
  if (dia === hoje) {
    return cores.diaHoje;
  }
  return cores.diaFuturo;
}

export default function ReguaDeDias({ diaDoMes, diasNoMes }: ReguaDeDiasProps) {
  // [1, 2, 3, ..., diasNoMes]
  const dias = Array.from({ length: diasNoMes }, (_, indice) => indice + 1);

  return (
    <View style={styles.bloco}>
      {/* Os traços são só desenho: o leitor de tela lê o texto de baixo */}
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.regua}
      >
        {dias.map((dia) => (
          <View key={dia} style={[styles.traco, { backgroundColor: corDoDia(dia, diaDoMes) }]} />
        ))}
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
    flexDirection: 'row',
    gap: 3,
  },
  traco: {
    flex: 1,
    height: 18,
    borderRadius: 3,
  },
});
