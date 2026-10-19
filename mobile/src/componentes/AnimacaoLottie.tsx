// Animação Lottie feita no próprio projeto (Módulo 19b). Lottie é um formato de
// animação em JSON: o arquivo descreve formas, cores e quadros-chave, e a
// biblioteca lottie-react-native desenha cada quadro no celular. Os dois
// arquivos ficam em mobile/assets/animacoes/ e usam as cores do tema:
// - "vazio": uma moeda que flutua devagar (2 s, em loop), nos estados vazios;
// - "sucesso": um círculo que se fecha e um check que se desenha (0,8 s, uma
//   vez só), ao marcar um pagamento.
//
// A animação é só enfeite: fica escondida do leitor de tela (o texto ao lado já
// diz tudo) e não recebe toques. Com "reduzir movimento" ligado, ela não roda:
// aparece parada no último quadro (progress 1), que é o desenho completo.
import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';

import { useMovimentoReduzido } from '@/movimento';

import animacaoDeSucesso from '../../assets/animacoes/sucesso.json';
import animacaoDoVazio from '../../assets/animacoes/vazio.json';

// O JSON é importado como objeto (o Metro e o Jest entendem .json sozinhos);
// a lottie-react-native aceita o objeto direto na prop "source"
const ANIMACOES = {
  vazio: animacaoDoVazio,
  sucesso: animacaoDeSucesso,
};

// Só "vazio" repete; "sucesso" toca uma vez e para no check
const REPETE = {
  vazio: true,
  sucesso: false,
};

type AnimacaoLottieProps = {
  animacao: keyof typeof ANIMACOES; // "vazio" ou "sucesso"
  tamanho: number; // largura e altura, em pontos
  // Chamada quando uma animação sem loop termina (não é chamada com "reduzir
  // movimento", porque aí a animação nem começa)
  aoTerminar?: () => void;
};

export default function AnimacaoLottie({ animacao, tamanho, aoTerminar }: AnimacaoLottieProps) {
  const movimentoReduzido = useMovimentoReduzido();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // pointerEvents "none": os toques atravessam a animação (ela fica dentro
      // de linhas tocáveis, como a do gasto fixo)
      style={[styles.caixa, { width: tamanho, height: tamanho }]}
    >
      <LottieView
        // A key muda quando "reduzir movimento" muda: o LottieView é montado de
        // novo, e a animação para (ou volta a tocar) na hora
        key={movimentoReduzido ? 'parada' : 'tocando'}
        testID={`animacao-${animacao}`}
        source={ANIMACOES[animacao]}
        autoPlay={!movimentoReduzido}
        loop={REPETE[animacao] && !movimentoReduzido}
        // Parada: o último quadro (1). Tocando: começa do primeiro (0)
        progress={movimentoReduzido ? 1 : 0}
        resizeMode="contain"
        onAnimationFinish={(cancelada) => {
          if (!cancelada) {
            aoTerminar?.();
          }
        }}
        style={styles.animacao}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    pointerEvents: 'none',
  },
  animacao: {
    width: '100%',
    height: '100%',
  },
});
