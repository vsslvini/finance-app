// Botão de olho do Início (Módulo 19b): esconde e mostra os valores em
// dinheiro da tela. Quem guarda o estado é a tela; este botão só desenha e
// avisa o toque.
//
// A troca entre os ícones "eye" e "eye-off" é um cross-fade: os dois ficam
// empilhados e um some enquanto o outro aparece, com uma leve troca de escala
// (o que sai encolhe, o que entra cresce). O ícone é uma fonte e não aceita cor
// nem forma animada, por isso a troca é pela opacidade, como na BarraDeAbas.
import { Lucide } from '@react-native-vector-icons/lucide';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import Tocavel from '@/componentes/Tocavel';
import { DURACAO_MEDIA } from '@/movimento';
import { cores } from '@/tema';
import { vibrarSelecao } from '@/vibrar';

// Área de toque mínima do guia (seção 11) e tamanho do ícone
const AREA_DE_TOQUE = 44;
const TAMANHO_DO_ICONE = 22;
// Escala do ícone que está saindo, no fim da troca
const ESCALA_DE_SAIDA = 0.6;

type BotaoDoOlhoProps = {
  visiveis: boolean; // os valores estão aparecendo?
  aoTocar: () => void;
};

export default function BotaoDoOlho({ visiveis, aoTocar }: BotaoDoOlhoProps) {
  // 0 = valores visíveis (olho aberto), 1 = escondidos (olho riscado)
  const escondido = useSharedValue(visiveis ? 0 : 1);

  // useEffect porque a animação acompanha uma mudança de estado. Com
  // "reduzir movimento", o withTiming (ReduceMotion.System) troca na hora
  useEffect(() => {
    escondido.value = withTiming(visiveis ? 0 : 1, {
      duration: DURACAO_MEDIA,
      easing: Easing.out(Easing.cubic),
    });
  }, [escondido, visiveis]);

  const estiloDoOlhoAberto = useAnimatedStyle(() => ({
    opacity: 1 - escondido.value,
    transform: [{ scale: interpolate(escondido.value, [0, 1], [1, ESCALA_DE_SAIDA]) }],
  }));
  const estiloDoOlhoRiscado = useAnimatedStyle(() => ({
    opacity: escondido.value,
    transform: [{ scale: interpolate(escondido.value, [0, 1], [ESCALA_DE_SAIDA, 1]) }],
  }));

  function aoTocarNoOlho() {
    vibrarSelecao();
    aoTocar();
  }

  return (
    <Tocavel
      accessibilityRole="button"
      // O nome diz o que o toque vai fazer, como num botão comum
      accessibilityLabel={visiveis ? 'Esconder valores' : 'Mostrar valores'}
      onPress={aoTocarNoOlho}
      style={styles.botao}
    >
      {/* Os ícones são só desenho: o nome do botão já diz tudo */}
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.camada, estiloDoOlhoAberto]}
      >
        <Lucide name="eye" size={TAMANHO_DO_ICONE} color={cores.textoSecundario} />
      </Animated.View>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.camada, estiloDoOlhoRiscado]}
      >
        <Lucide name="eye-off" size={TAMANHO_DO_ICONE} color={cores.textoSecundario} />
      </Animated.View>
    </Tocavel>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: AREA_DE_TOQUE,
    height: AREA_DE_TOQUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camada: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
