// Destaque do Início: o "posso gastar por dia", o número grande da tela.
//
// Desde o Módulo 19b ele fica num cartão com gradiente roxo (gradientes.destaque
// em tema.ts) e, quando o valor é positivo, um brilho roxo suave "respira" no
// canto de cima, à direita: cresce e esmaece num vaivém lento, só para o
// destaque parecer vivo. O número em si aparece pronto (não conta de 0 até o
// valor), para nunca mostrar um valor errado no meio da animação.
//
// O brilho é um círculo SVG pintado com um gradiente radial (roxo no centro,
// transparente na borda); é o jeito de fazer uma luz difusa sem desfoque (blur).
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { DURACAO_RESPIRO, useMovimentoReduzido } from '@/movimento';
import { cantos, cores, espaco, fontes, gradientes, textos } from '@/tema';
import { useDinheiro } from '@/valoresVisiveis';

// Tamanho do brilho, em pontos, e quanto dele fica para fora do cartão (o
// cartão corta o que passa da borda)
const TAMANHO_DO_BRILHO = 220;
const BRILHO_PARA_FORA = 80;
// Opacidade do roxo no centro do brilho. Baixa de propósito: o brilho fica
// longe do texto e não pode atrapalhar a leitura
const OPACIDADE_NO_CENTRO = 0.32;
// O respiro: a opacidade do brilho vai de 0,55 a 1 e a escala de 0,9 a 1,05.
// Cada sentido leva DURACAO_RESPIRO (2,4 s), então o vaivém completo dura 4,8 s,
// mais lento que o do estado vazio: é um fundo, não pode chamar atenção
const OPACIDADE_MINIMA = 0.55;
const ESCALA_MINIMA = 0.9;
const ESCALA_MAXIMA = 1.05;
// Com "reduzir movimento", o brilho fica parado no meio do caminho
const RESPIRO_PARADO = 0.5;

// "R$ 31,31" -> ["R$ 31", "31"], para desenhar os centavos menores
function separarCentavos(textoEmReais: string): [string, string] {
  const virgula = textoEmReais.lastIndexOf(',');
  return [textoEmReais.slice(0, virgula), textoEmReais.slice(virgula + 1)];
}

// O brilho que respira. É só desenho: fica escondido do leitor de tela e não
// recebe toque
function Brilho() {
  const respiro = useSharedValue(0);
  const movimentoReduzido = useMovimentoReduzido();

  // useEffect porque iniciar uma animação é um efeito. Com "reduzir
  // movimento" ligado, o loop nem começa. Ao sair da tela, o loop é cancelado
  useEffect(() => {
    if (movimentoReduzido) {
      respiro.value = RESPIRO_PARADO;
      return;
    }
    // -1 repete sem parar; true faz ir e voltar
    respiro.value = withRepeat(
      withTiming(1, { duration: DURACAO_RESPIRO, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(respiro);
  }, [movimentoReduzido, respiro]);

  const estiloDoRespiro = useAnimatedStyle(() => ({
    opacity: interpolate(respiro.value, [0, 1], [OPACIDADE_MINIMA, 1]),
    transform: [{ scale: interpolate(respiro.value, [0, 1], [ESCALA_MINIMA, ESCALA_MAXIMA]) }],
  }));

  const raio = TAMANHO_DO_BRILHO / 2;
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.brilho, estiloDoRespiro]}
    >
      <Svg width={TAMANHO_DO_BRILHO} height={TAMANHO_DO_BRILHO}>
        <Defs>
          {/* Roxo no centro, sumindo até ficar transparente na borda */}
          <RadialGradient id="brilho-do-destaque" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={cores.brilhoDestaque} stopOpacity={OPACIDADE_NO_CENTRO} />
            <Stop offset="1" stopColor={cores.brilhoDestaque} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={raio} cy={raio} r={raio} fill="url(#brilho-do-destaque)" />
      </Svg>
    </Animated.View>
  );
}

type DestaqueDoDiaProps = {
  valor: string; // posso_gastar_por_dia, ex.: "31.31" ou "-10.00"
  separando: string | null; // falta_guardar_no_mes, ex.: "200.00"; null = sem desconto
};

// O número grande do dia. Os centavos ficam menores, mas tudo está num só
// Text, então o texto completo continua igual a formatarReais(valor).
export default function DestaqueDoDia({ valor, separando }: DestaqueDoDiaProps) {
  const dinheiro = useDinheiro();
  // Com os valores escondidos, nem a cor nem o brilho podem contar se o valor
  // é positivo ou negativo
  const negativo = dinheiro.visiveis && valor.startsWith('-');
  const positivo = dinheiro.visiveis && Number(valor) > 0;

  return (
    <View style={styles.cartao}>
      {/* O gradiente cobre o cartão inteiro, atrás de tudo */}
      <LinearGradient
        colors={gradientes.destaque}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {positivo && <Brilho />}

      <View
        accessible
        accessibilityLabel={dinheiro.rotulo('Posso gastar por dia', valor)}
        style={styles.numero}
      >
        <Text style={textos.rotulo}>Posso gastar por dia</Text>
        {dinheiro.visiveis ? (
          <NumeroComCentavos texto={dinheiro.reais(valor)} negativo={negativo} />
        ) : (
          <Text style={textos.numeroDestaque}>{dinheiro.reais(valor)}</Text>
        )}
      </View>
      {/* Fora do bloco "accessible" acima, para o leitor de tela ler esta
          linha também (o rótulo do bloco substitui os textos de dentro dele) */}
      {separando !== null && (
        <Text style={[textos.detalhe, styles.detalheNoCartao]}>
          {`já separando ${dinheiro.reais(separando)} para guardar`}
        </Text>
      )}
    </View>
  );
}

type NumeroComCentavosProps = {
  texto: string; // "R$ 31,31"
  negativo: boolean;
};

function NumeroComCentavos({ texto, negativo }: NumeroComCentavosProps) {
  const [parteInteira, centavos] = separarCentavos(texto);
  return (
    <Text style={[textos.numeroDestaque, negativo && styles.negativo]}>
      {parteInteira}
      <Text style={styles.centavos}>{',' + centavos}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: cantos.cartao,
    padding: espaco.grande,
    gap: espaco.minimo,
    // Corta o gradiente e o brilho nos cantos arredondados
    overflow: 'hidden',
  },
  brilho: {
    position: 'absolute',
    top: -BRILHO_PARA_FORA,
    right: -BRILHO_PARA_FORA,
    width: TAMANHO_DO_BRILHO,
    height: TAMANHO_DO_BRILHO,
    pointerEvents: 'none',
  },
  numero: {
    gap: espaco.minimo,
  },
  centavos: {
    fontFamily: fontes.seminegrito,
    fontSize: 18,
    letterSpacing: 0,
    color: cores.textoSecundario,
  },
  negativo: {
    color: cores.negativo,
  },
  detalheNoCartao: {
    // Sobre o roxo, o textoTerciario ficaria perto do limite de contraste
    // (4,5:1); o textoSecundario passa com folga
    color: cores.textoSecundario,
  },
});
