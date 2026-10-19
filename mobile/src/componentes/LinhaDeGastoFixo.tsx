// Uma linha da lista de gastos fixos na aba "A pagar". Tem dois alvos de toque
// lado a lado: a parte da esquerda abre a folha do gasto (editar ou apagar) e o
// botão da direita marca ou desmarca o pagamento do mês.
//
// Módulo 19b: quando o gasto passa a pago, o ícone da situação dá um giro curto
// (IconeAoMarcar). Se foi a pessoa que acabou de marcar ("comemorar"), no lugar
// do ícone toca uma vez a animação de sucesso (um check que se desenha, 0,8 s);
// quando ela termina, o ícone normal volta.
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import type { GastoFixo } from '@/api';
import AnimacaoLottie from '@/componentes/AnimacaoLottie';
import Botao from '@/componentes/Botao';
import IconeAoMarcar from '@/componentes/IconeAoMarcar';
import { formatarNumero, formatarReais, mesPorExtenso, nomeCurtoDoMes } from '@/formatacao';
import { useMovimentoReduzido } from '@/movimento';
import { cores, espaco, textos, toque } from '@/tema';

// Mesmo tamanho do ícone da situação, para a linha não mudar de altura
const TAMANHO_DO_ICONE = 14;

type LinhaDeGastoFixoProps = {
  gasto: GastoFixo;
  comDivisoria: boolean;
  ocupado: boolean; // true enquanto um pedido de marcar está em andamento
  aoAbrir: () => void;
  aoAlternarPagamento: () => void;
  // true logo depois de a pessoa marcar este gasto como pago (quem decide é a
  // aba, que sabe qual botão foi tocado). Padrão: false
  comemorar?: boolean;
  // A animação de sucesso terminou: a aba volta "comemorar" para false
  aoTerminarComemoracao?: () => void;
};

export default function LinhaDeGastoFixo({
  gasto,
  comDivisoria,
  ocupado,
  aoAbrir,
  aoAlternarPagamento,
  comemorar = false,
  aoTerminarComemoracao,
}: LinhaDeGastoFixoProps) {
  const { situacao, mes } = gasto.este_mes;
  const nomeDoMes = nomeCurtoDoMes(mes);
  const movimentoReduzido = useMovimentoReduzido();
  const pago = situacao === 'pago_manual' || situacao === 'pago_automatico';
  // A animação de sucesso só aparece com o gasto já pago na tela (depois de a
  // lista ser relida) e nunca com "reduzir movimento" (aí fica o ícone parado)
  const mostrarSucesso = comemorar && pago && !movimentoReduzido;

  // Situação com ícone e texto (a cor sozinha não basta para quem não enxerga bem)
  let icone: LucideIconName;
  let textoDaSituacao: string;
  let fraseDaSituacao: string;
  let cor: ColorValue = cores.acento;
  if (situacao === 'pago_manual') {
    icone = 'circle-check';
    textoDaSituacao = 'Pago';
    fraseDaSituacao = `Pago em ${nomeDoMes}.`;
  } else if (situacao === 'pago_automatico') {
    icone = 'circle-check';
    textoDaSituacao = 'Pago (achado nas transações)';
    fraseDaSituacao = `Pago em ${nomeDoMes}, achado nas transações.`;
  } else if (situacao === 'nao_comecou') {
    icone = 'calendar';
    textoDaSituacao = `Começa em ${mesPorExtenso(gasto.mes_inicio)}`;
    fraseDaSituacao = `Começa em ${mesPorExtenso(gasto.mes_inicio)}.`;
    cor = cores.textoSecundario;
  } else {
    icone = 'circle';
    textoDaSituacao = 'A pagar';
    fraseDaSituacao = `A pagar em ${nomeDoMes}.`;
    cor = cores.textoSecundario;
  }

  const dia = gasto.dia_vencimento;
  const valorEDia =
    dia === null
      ? formatarReais(gasto.valor)
      : `${formatarReais(gasto.valor)} · vence dia ${dia}`;
  const trechoDoDia = dia === null ? '' : `, vence dia ${dia}`;
  const rotulo = `${gasto.nome}, ${formatarNumero(gasto.valor)} reais por mês${trechoDoDia}. ${fraseDaSituacao}`;

  // Só "a pagar" e "pago manual" têm botão: o pago automático não se desmarca
  // e o que ainda não começou não tem o que marcar
  let botao: { titulo: string; rotulo: string } | null = null;
  if (situacao === 'a_pagar') {
    botao = {
      titulo: 'Marcar pago',
      rotulo: `Marcar ${gasto.nome} como pago em ${nomeDoMes}`,
    };
  } else if (situacao === 'pago_manual') {
    botao = {
      titulo: 'Desmarcar',
      rotulo: `Desmarcar o pagamento de ${gasto.nome} em ${nomeDoMes}`,
    };
  }

  return (
    <View style={[styles.linha, comDivisoria && styles.linhaComDivisoria]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        accessibilityHint="Toque para editar ou apagar"
        onPress={aoAbrir}
        style={({ pressed }) => [styles.texto, pressed && toque.apertadoIcone]}
      >
        <Text style={textos.corpo}>{gasto.nome}</Text>
        <Text style={textos.detalhe}>{valorEDia}</Text>
        <View style={styles.situacao}>
          {/* Só desenho: o texto ao lado já diz a situação */}
          <IconeAoMarcar marcado={pago}>
            {mostrarSucesso ? (
              <AnimacaoLottie
                animacao="sucesso"
                tamanho={TAMANHO_DO_ICONE}
                aoTerminar={aoTerminarComemoracao}
              />
            ) : (
              <Lucide
                name={icone}
                size={TAMANHO_DO_ICONE}
                color={cor}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            )}
          </IconeAoMarcar>
          <Text style={[textos.rotulo, { color: cor }]}>{textoDaSituacao}</Text>
        </View>
      </Pressable>
      {botao !== null && (
        <Botao
          titulo={botao.titulo}
          rotulo={botao.rotulo}
          tipo="secundario"
          aoTocar={aoAlternarPagamento}
          desativado={ocupado}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.medio,
    paddingVertical: espaco.pequeno,
  },
  linhaComDivisoria: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  texto: {
    // flex: 1 deixa o texto ocupar o que sobrar ao lado do botão
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
    gap: 2,
  },
  situacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.minimo,
  },
});
