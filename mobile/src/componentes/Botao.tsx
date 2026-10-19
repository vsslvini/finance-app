// Botão do guia de design: "principal" (fundo cheio) ou "secundario" (só contorno).
import { StyleSheet, Text } from 'react-native';

import { cantos, cores, espaco, textos } from '@/tema';
import Tocavel from '@/componentes/Tocavel';
import { vibrarToque } from '@/vibrar';

// Opacidade do botão desativado (antes o estilo "apagado")
const OPACIDADE_APAGADO = 0.7;

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

  function aoPressionar() {
    if (principal) {
      vibrarToque();
    }
    aoTocar();
  }

  return (
    // Tocavel anima a escala (mola curta) e a opacidade no aperto. A vibração
    // leve só vale no botão principal (a ação mais importante da tela).
    <Tocavel
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desativado }}
      disabled={desativado}
      onPress={aoPressionar}
      opacidadeEmRepouso={desativado ? OPACIDADE_APAGADO : 1}
      style={[styles.botao, principal ? styles.principal : styles.secundario]}
    >
      <Text style={[textos.botao, principal ? styles.textoPrincipal : styles.textoSecundario]}>
        {titulo}
      </Text>
    </Tocavel>
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
  textoPrincipal: {
    color: cores.textoSobreAcento,
  },
  textoSecundario: {
    color: cores.acento,
  },
});
