// Botão do guia de design: "principal" (fundo cheio) ou "secundario" (só contorno).
import { Pressable, StyleSheet, Text } from 'react-native';

import { cantos, cores, espaco, textos, toque } from '@/tema';

type BotaoProps = {
  titulo: string;
  aoTocar: () => void;
  tipo: 'principal' | 'secundario';
  desativado?: boolean;
  // Nome lido pelo leitor de tela quando precisa ser mais claro que o título
  // (ex.: "Marcar Apartamento como pago em outubro"); sem ele, vale o título
  rotulo?: string;
};

export default function Botao({
  titulo,
  aoTocar,
  tipo,
  desativado = false,
  rotulo,
}: BotaoProps) {
  const principal = tipo === 'principal';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desativado }}
      disabled={desativado}
      onPress={aoTocar}
      style={({ pressed }) => [
        styles.botao,
        principal ? styles.principal : styles.secundario,
        pressed && toque.apertado,
        desativado && styles.apagado,
      ]}
    >
      <Text style={[textos.botao, principal ? styles.textoPrincipal : styles.textoSecundario]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: espaco.maior,
    borderRadius: cantos.botao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  principal: {
    backgroundColor: cores.acento,
  },
  secundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: cores.acento,
  },
  apagado: {
    opacity: 0.7,
  },
  textoPrincipal: {
    color: cores.textoSobreAcento,
  },
  textoSecundario: {
    color: cores.acento,
  },
});
