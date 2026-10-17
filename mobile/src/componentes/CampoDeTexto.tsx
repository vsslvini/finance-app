// Campo de texto do guia de design (seção 7, "Campo de texto / número"):
// borda fina, que fica roxa enquanto está em foco e vermelha quando há erro.
// Usado pelas folhas de edição (FolhaDeEdicao e FolhaDoPlano).
import { useState } from 'react';
import { StyleSheet, TextInput, type KeyboardTypeOptions } from 'react-native';

import { cantos, cores, espaco, textos } from '@/tema';

type CampoDeTextoProps = {
  rotulo: string; // lido pelo leitor de tela, ex.: "Quanto por mês"
  teclado: KeyboardTypeOptions; // ex.: "decimal-pad"
  valor: string;
  aoDigitar: (texto: string) => void;
  comErro: boolean; // pinta a borda de vermelho
};

export default function CampoDeTexto({
  rotulo,
  teclado,
  valor,
  aoDigitar,
  comErro,
}: CampoDeTextoProps) {
  // O foco só muda a cor da borda, então fica guardado aqui dentro
  const [emFoco, setEmFoco] = useState(false);

  return (
    <TextInput
      accessibilityLabel={rotulo}
      keyboardType={teclado}
      value={valor}
      onChangeText={aoDigitar}
      onFocus={() => setEmFoco(true)}
      onBlur={() => setEmFoco(false)}
      placeholderTextColor={cores.textoTerciario}
      style={[
        textos.corpo,
        styles.campo,
        // Erro tem prioridade sobre o foco
        comErro ? styles.campoComErro : emFoco && styles.campoEmFoco,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  campo: {
    minHeight: 48,
    paddingHorizontal: espaco.medio,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: cantos.campo,
  },
  campoEmFoco: {
    borderWidth: 2,
    borderColor: cores.acento,
  },
  campoComErro: {
    borderWidth: 2,
    borderColor: cores.erro,
  },
});
