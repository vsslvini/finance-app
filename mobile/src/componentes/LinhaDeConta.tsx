// Uma linha da tela Contas: ícone do tipo, nome da conta, "Saldo" ou
// "Fatura aberta" embaixo e o valor à direita.
import { Lucide } from '@react-native-vector-icons/lucide';
import { StyleSheet, Text, View } from 'react-native';

import type { Conta } from '@/api';
import { formatarReais, rotuloEmReais } from '@/formatacao';
import { cores, espaco, textos } from '@/tema';

type LinhaDeContaProps = {
  conta: Conta;
  comDivisoria: boolean; // a primeira linha do grupo não tem divisória em cima
};

export default function LinhaDeConta({ conta, comDivisoria }: LinhaDeContaProps) {
  const cartao = conta.tipo === 'cartao';
  // No cartão, o "saldo" da API é o valor da fatura aberta
  const tipoDoValor = cartao ? 'Fatura aberta' : 'Saldo';
  const negativo = conta.saldo.startsWith('-');

  // "Inter, Conta Corrente, saldo: 1.234,56 reais" (o rótulo vai em minúsculas
  // no meio da frase; rotuloEmReais já diz "menos" no valor negativo)
  const rotulo = `${conta.nome_banco}, ${conta.nome}, ${rotuloEmReais(tipoDoValor.toLowerCase(), conta.saldo)}`;

  return (
    <View
      accessible
      accessibilityLabel={rotulo}
      style={[styles.linha, comDivisoria && styles.divisoria]}
    >
      {/* Ícone só de enfeite: o texto embaixo do nome já diz o tipo */}
      <Lucide
        name={cartao ? 'credit-card' : 'wallet'}
        size={16}
        color={cores.textoSecundario}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.meio}>
        <Text style={textos.corpo}>{conta.nome}</Text>
        <Text style={textos.detalhe}>{tipoDoValor}</Text>
      </View>
      {/* formatarReais já põe o "- " no negativo ("- R$ 50,00") */}
      <Text style={[textos.valor, negativo && styles.negativo]}>{formatarReais(conta.saldo)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.medio,
    paddingVertical: espaco.medio,
  },
  divisoria: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  meio: {
    // flex: 1 deixa o nome quebrar a linha sem empurrar o valor para fora
    flex: 1,
    gap: 2,
  },
  negativo: {
    color: cores.negativo,
  },
});
