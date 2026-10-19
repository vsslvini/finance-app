// Folha que sobe de baixo da tela: a base das 5 folhas do app (edição, plano,
// categoria, nova dívida e dívida). Cuida do fundo escurecido, dos cantos, da
// área segura de baixo, do teclado e da animação de entrada; cada folha só
// traz o conteúdo.
import { useContext, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  View,
  type DimensionValue,
} from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { cantos, cores, espaco, fundoEscurecido } from '@/tema';

// Seção 10 do guia de design: a folha sobe em 250 ms, desacelerando no fim,
// sem quique. Sem .reduceMotion(), vale o padrão do Reanimated 4
// (ReduceMotion.System): com "reduzir movimento" ligado no celular, a entrada
// é pulada e a folha já aparece no lugar.
const ENTRADA_DA_FOLHA = SlideInDown.duration(250).easing(Easing.out(Easing.cubic));

type FolhaProps = {
  aoFechar: () => void; // botão voltar do Android (e o gesto de voltar no iOS)
  // Altura máxima da folha (ex.: '85%'), para folhas com lista ou campos que rolam
  alturaMaxima?: DimensionValue;
  children: ReactNode;
};

export default function Folha({ aoFechar, alturaMaxima, children }: FolhaProps) {
  // A área segura de baixo vem do provedor do app. Dentro do Modal, a
  // SafeAreaView não recebia a medida no Android (o Modal é outra janela), e o
  // fim da folha ficava atrás da barra de navegação do sistema
  // (sem provedor, como em alguns testes, vale 0)
  const fundoSeguro = useContext(SafeAreaInsetsContext)?.bottom ?? 0;

  return (
    // "fade" no Modal só escurece o fundo no lugar; quem sobe é a folha, logo abaixo.
    // Fechar continua instantâneo (sem animação de saída)
    <Modal visible transparent animationType="fade" onRequestClose={aoFechar}>
      {/* Sobe a folha junto com o teclado no iPhone; no Android o sistema já faz isso */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fundo}
      >
        {/* O fundo e os cantos ficam na View animada; a área segura vai por dentro,
            somando o espaço do rodapé do aparelho ao preenchimento */}
        <Animated.View
          entering={ENTRADA_DA_FOLHA}
          style={[styles.folha, alturaMaxima !== undefined && { maxHeight: alturaMaxima }]}
        >
          <View style={[styles.conteudo, { paddingBottom: espaco.grande + fundoSeguro }]}>
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: fundoEscurecido,
  },
  folha: {
    backgroundColor: cores.superficieElevada,
    borderTopLeftRadius: cantos.folha,
    borderTopRightRadius: cantos.folha,
  },
  conteudo: {
    // flexShrink: com maxHeight, o conteúdo encolhe e as listas dentro rolam
    flexShrink: 1,
    padding: espaco.grande,
    gap: espaco.medio,
  },
});
