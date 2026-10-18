// Estado "carregando" do guia de design: indicador na cor do acento e um texto
// dizendo o que está sendo buscado. Ocupa todo o espaço livre e fica no centro.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { cores, espaco, textos } from '@/tema';

type CarregandoProps = {
  texto: string; // ex.: "Carregando os cartões..."
};

export default function Carregando({ texto }: CarregandoProps) {
  return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color={cores.acento} />
      <Text style={[textos.corpo, styles.texto]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.maior,
    gap: espaco.grande,
  },
  texto: {
    color: cores.textoSecundario,
    textAlign: 'center',
  },
});
