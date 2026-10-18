// Uma linha da lista da tela Transações: ícone da categoria, descrição, duas
// linhas de detalhe e o valor com sinal à direita.
import { Lucide } from '@react-native-vector-icons/lucide';
import { StyleSheet, Text, View } from 'react-native';

import type { Transacao } from '@/api';
import { iconeDaCategoria } from '@/categorias';
import { formatarData, formatarNumero, formatarReais } from '@/formatacao';
import { cantos, cores, espaco, textos } from '@/tema';

type ItemDeTransacaoProps = {
  transacao: Transacao;
  // A primeira linha não tem divisória em cima; as outras têm
  comDivisoria: boolean;
  // A primeira e a última linha arredondam os cantos do cartão da lista
  primeira: boolean;
  ultima: boolean;
};

export default function ItemDeTransacao({
  transacao,
  comDivisoria,
  primeira,
  ultima,
}: ItemDeTransacaoProps) {
  const icone = iconeDaCategoria(transacao.categoria);
  // Saída vem negativa da API ("-45.90"); entrada vem positiva ("3000.00")
  const saida = transacao.valor.startsWith('-');
  const data = formatarData(transacao.data);

  // A parcela só aparece quando a API manda os dois números
  const temParcela = transacao.parcela_atual !== null && transacao.total_parcelas !== null;
  const parcela = temParcela
    ? `Parcela ${transacao.parcela_atual} de ${transacao.total_parcelas}`
    : null;

  // formatarReais já põe o "- " na saída; na entrada, colocamos o "+ " aqui,
  // porque a cor nunca é a única pista (guia de design, seção 11)
  const valorNaTela = saida ? formatarReais(transacao.valor) : `+ ${formatarReais(transacao.valor)}`;

  // O leitor de tela lê esta frase no lugar dos textos de dentro do item.
  // "iFood, saída de 45,90 reais, 08/10, Nubank Mastercard Black, categoria Food delivery"
  const rotulo =
    `${transacao.descricao}, ${saida ? 'saída' : 'entrada'} de ` +
    `${formatarNumero(transacao.valor)} reais, ${data}, ` +
    `${transacao.nome_banco} ${transacao.nome_conta}, categoria ${transacao.categoria}` +
    (parcela !== null ? `, ${parcela.toLowerCase()}` : '');

  return (
    <View
      accessible
      accessibilityLabel={rotulo}
      style={[
        styles.item,
        comDivisoria && styles.divisoria,
        primeira && styles.cantosDeCima,
        ultima && styles.cantosDeBaixo,
      ]}
    >
      {/* Círculo da categoria: só desenho, escondido do leitor de tela */}
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.icone, { backgroundColor: icone.fundo }]}
      >
        <Lucide name={icone.icone} size={16} color={icone.cor} />
      </View>
      <View style={styles.meio}>
        <Text style={textos.corpo}>{transacao.descricao}</Text>
        <Text style={textos.detalhe}>
          {`${data} · ${transacao.nome_banco} · ${transacao.nome_conta}`}
        </Text>
        <Text style={textos.detalhe}>
          {parcela !== null ? `${transacao.categoria} · ${parcela}` : transacao.categoria}
        </Text>
      </View>
      <Text style={[textos.valor, saida ? styles.negativo : styles.positivo]}>{valorNaTela}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.medio,
    paddingVertical: espaco.medio,
    paddingHorizontal: espaco.grande,
    backgroundColor: cores.superficie,
  },
  divisoria: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  cantosDeCima: {
    borderTopLeftRadius: cantos.cartao,
    borderTopRightRadius: cantos.cartao,
  },
  cantosDeBaixo: {
    borderBottomLeftRadius: cantos.cartao,
    borderBottomRightRadius: cantos.cartao,
  },
  icone: {
    width: 30,
    height: 30,
    borderRadius: cantos.icone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meio: {
    // flex: 1 deixa a descrição quebrar a linha sem empurrar o valor para fora
    flex: 1,
    gap: 2,
  },
  positivo: {
    color: cores.positivo,
  },
  negativo: {
    color: cores.negativo,
  },
});
