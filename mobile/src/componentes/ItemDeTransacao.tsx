// Uma linha da lista da tela Transações: ícone da categoria, descrição, duas
// linhas de detalhe e o valor com sinal à direita. Com "aoTocar", a linha
// inteira é um botão: tocar nela abre a folha "Categoria" (quem abre a folha é
// a ListaDeTransacoes). Sem "aoTocar" (os maiores gastos do Relatório), a linha
// é só leitura: o mesmo visual, mas sem papel de botão.
import { Lucide } from '@react-native-vector-icons/lucide';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Transacao } from '@/api';
import { iconeDaCategoria } from '@/categorias';
import { formatarData, formatarNumero, formatarReais } from '@/formatacao';
import { cantos, cores, espaco, textos, toque } from '@/tema';

type ItemDeTransacaoProps = {
  transacao: Transacao;
  // A primeira linha não tem divisória em cima; as outras têm
  comDivisoria: boolean;
  // A primeira e a última linha arredondam os cantos do cartão da lista
  primeira: boolean;
  ultima: boolean;
  aoTocar?: () => void; // abre a folha de trocar a categoria; sem ele, não é botão
};

export default function ItemDeTransacao({
  transacao,
  comDivisoria,
  primeira,
  ultima,
  aoTocar,
}: ItemDeTransacaoProps) {
  // O ícone vem do nome em inglês (categoria_original), que não muda com a
  // tradução; o texto mostrado é a categoria em português
  const icone = iconeDaCategoria(transacao.categoria_original);
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
  // "iFood, saída de 45,90 reais, 08/10, Nubank Mastercard Black, categoria Delivery"
  const rotulo =
    `${transacao.descricao}, ${saida ? 'saída' : 'entrada'} de ` +
    `${formatarNumero(transacao.valor)} reais, ${data}, ` +
    `${transacao.nome_banco} ${transacao.nome_conta}, categoria ${transacao.categoria}` +
    (parcela !== null ? `, ${parcela.toLowerCase()}` : '');

  // Estilos da linha, iguais com ou sem toque
  const estiloDaLinha: StyleProp<ViewStyle> = [
    styles.item,
    comDivisoria && styles.divisoria,
    primeira && styles.cantosDeCima,
    ultima && styles.cantosDeBaixo,
  ];

  // O que vai dentro da linha (ícone, textos e valor), igual nos dois casos
  const conteudo = (
    <>
      {/* Círculo da categoria: só desenho, escondido do leitor de tela. O
          testID (o mesmo da tela Início) deixa os testes conferirem o ícone */}
      <View
        testID={`icone-categoria-${icone.icone}`}
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
    </>
  );

  // Só leitura: "accessible" junta tudo num item só para o leitor de tela,
  // que lê o mesmo rótulo, mas sem dizer "botão" e sem a dica de toque
  if (aoTocar === undefined) {
    return (
      <View accessible accessibilityLabel={rotulo} style={estiloDaLinha}>
        {conteudo}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      // O "hint" é lido depois do rótulo e conta o que o toque faz
      accessibilityHint="Toque para trocar a categoria"
      onPress={aoTocar}
      style={({ pressed }) => [estiloDaLinha, pressed && toque.apertadoIcone]}
    >
      {conteudo}
    </Pressable>
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
