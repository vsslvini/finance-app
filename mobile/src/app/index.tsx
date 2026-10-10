import { StyleSheet, Text, View } from 'react-native';

// Tela provisória da rota "/" (Início). Será trocada pela tela de verdade
// quando o mobile-ui-expert propor o layout.
export default function InicioScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.titulo}>
        Início
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
