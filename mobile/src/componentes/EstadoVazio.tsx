// Estado vazio de uma lista: um ícone de traço fino acima do texto. O ícone é só
// desenho, então fica escondido do leitor de tela (o texto já diz tudo). Quem
// usa decide o cartão em volta; este componente só desenha o ícone e a frase.
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { StyleSheet, Text, View } from 'react-native';

import { cores, espaco, textos } from '@/tema';

type EstadoVazioProps = {
  icone: LucideIconName; // ex.: "receipt"
  texto: string; // ex.: "Nenhum gasto neste mês ainda."
};

export default function EstadoVazio({ icone, texto }: EstadoVazioProps) {
  return (
    <View style={styles.area}>
      <Lucide
        name={icone}
        size={40}
        color={cores.textoTerciario}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[textos.corpo, styles.texto]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    alignItems: 'center',
    gap: espaco.medio,
  },
  texto: {
    color: cores.textoSecundario,
    textAlign: 'center',
  },
});
