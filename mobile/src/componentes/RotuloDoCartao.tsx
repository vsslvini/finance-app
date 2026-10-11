import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { StyleSheet, Text, View } from 'react-native';

import { cores, espaco, textos } from '@/tema';

type RotuloDoCartaoProps = {
  texto: string; // ex.: "Saldo"
  icone: LucideIconName; // ex.: "wallet"
  corDoIcone?: string; // padrão: cores.textoSecundario
};

// Rótulo pequeno de um cartão (ex.: "Saldo") com um ícone Lucide antes.
// O ícone é só desenho: fica escondido do leitor de tela, porque o
// rótulo do cartão já diz tudo.
export default function RotuloDoCartao({
  texto,
  icone,
  corDoIcone = cores.textoSecundario,
}: RotuloDoCartaoProps) {
  return (
    <View style={styles.linha}>
      <Lucide
        name={icone}
        size={16}
        color={corDoIcone}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={textos.rotulo}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.minimo,
  },
});
