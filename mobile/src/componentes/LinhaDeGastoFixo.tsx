// Uma linha da lista de gastos fixos na aba "A pagar". Tem dois alvos de toque
// lado a lado: a parte da esquerda abre a folha do gasto (editar ou apagar) e o
// botão da direita marca ou desmarca o pagamento do mês.
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import type { GastoFixo } from '@/api';
import Botao from '@/componentes/Botao';
import { formatarNumero, formatarReais, mesPorExtenso, nomeCurtoDoMes } from '@/formatacao';
import { cores, espaco, textos, toque } from '@/tema';

type LinhaDeGastoFixoProps = {
  gasto: GastoFixo;
  comDivisoria: boolean;
  ocupado: boolean; // true enquanto um pedido de marcar está em andamento
  aoAbrir: () => void;
  aoAlternarPagamento: () => void;
};

export default function LinhaDeGastoFixo({
  gasto,
  comDivisoria,
  ocupado,
  aoAbrir,
  aoAlternarPagamento,
}: LinhaDeGastoFixoProps) {
  const { situacao, mes } = gasto.este_mes;
  const nomeDoMes = nomeCurtoDoMes(mes);

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
          <Lucide
            name={icone}
            size={14}
            color={cor}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
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
