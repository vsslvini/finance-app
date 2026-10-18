// Estado "erro" do guia de design: a mensagem do tipo de erro e o botão
// secundário "Tentar de novo". Ocupa todo o espaço livre e fica no centro.
import { StyleSheet, Text, View } from 'react-native';

import type { TipoErroApi } from '@/api';
import Botao from '@/componentes/Botao';
import { MENSAGENS_DE_ERRO } from '@/mensagens';
import { espaco, textos } from '@/tema';

type MensagemDeErroProps = {
  erro: TipoErroApi;
  aoTentarDeNovo: () => void;
};

export default function MensagemDeErro({ erro, aoTentarDeNovo }: MensagemDeErroProps) {
  // Erro de token não tem botão: tentar de novo não resolve, é preciso
  // corrigir o .env (a mesma regra da tela Início)
  const mostrarBotao = erro !== 'token';
  return (
    <View style={styles.centro}>
      <Text style={[textos.corpo, styles.texto]}>{MENSAGENS_DE_ERRO[erro]}</Text>
      {mostrarBotao && <Botao titulo="Tentar de novo" tipo="secundario" aoTocar={aoTentarDeNovo} />}
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
    textAlign: 'center',
  },
});
