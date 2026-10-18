// Um cartão de crédito na tela Cartões: banco, nome, fatura aberta, limite e
// as datas de fechamento e vencimento.
import { StyleSheet, Text, View } from 'react-native';

import type { Conta } from '@/api';
import RotuloDoCartao from '@/componentes/RotuloDoCartao';
import { formatarData, formatarNumero, formatarReais, rotuloEmReais } from '@/formatacao';
import { cantos, cores, espaco, textos } from '@/tema';

type BlocoDoCartaoProps = {
  cartao: Conta; // uma conta com tipo "cartao"
};

// "-10.00" -> "menos 10,00"; "10.00" -> "10,00" (para o leitor de tela)
function numeroFalado(valor: string): string {
  const menos = valor.startsWith('-') ? 'menos ' : '';
  return `${menos}${formatarNumero(valor)}`;
}

// As datas que a Pluggy mandou, na ordem em que acontecem:
// ["Fecha em 28/10", "Vence em 05/11"], só uma delas, ou nenhuma
function datasDoCartao(cartao: Conta): string[] {
  const datas: string[] = [];
  if (cartao.data_fechamento !== null) {
    datas.push(`Fecha em ${formatarData(cartao.data_fechamento)}`);
  }
  if (cartao.data_vencimento !== null) {
    datas.push(`Vence em ${formatarData(cartao.data_vencimento)}`);
  }
  return datas;
}

export default function BlocoDoCartao({ cartao }: BlocoDoCartaoProps) {
  const { limite_disponivel: disponivel, limite_total: total } = cartao;
  // Só mostramos o limite quando os dois números vieram; com um só, a frase
  // "X de Y" ficaria pela metade
  const temLimite = disponivel !== null && total !== null;

  const limiteNaTela = temLimite
    ? `Limite disponível: ${formatarReais(disponivel)} de ${formatarReais(total)}`
    : 'Limite não informado';
  const limiteFalado = temLimite
    ? `Limite disponível: ${numeroFalado(disponivel)} de ${numeroFalado(total)} reais`
    : 'Limite não informado';

  const datas = datasDoCartao(cartao);

  // O bloco inteiro é lido como uma frase só, com ponto entre as partes:
  // "Nubank, Mastercard Black. Fatura aberta: 845,10 reais. Limite disponível:
  // 4.154,90 de 5.000,00 reais. Vence em 05/11."
  const partesFaladas = [
    `${cartao.nome_banco}, ${cartao.nome}`,
    rotuloEmReais('Fatura aberta', cartao.saldo),
    limiteFalado,
    ...datas,
  ];
  const rotulo = partesFaladas.map((parte) => `${parte}.`).join(' ');

  return (
    <View accessible accessibilityLabel={rotulo} style={styles.cartao}>
      <View style={styles.nomes}>
        <Text style={textos.subtitulo}>{cartao.nome_banco}</Text>
        <Text style={textos.detalhe}>{cartao.nome}</Text>
      </View>
      <View style={styles.fatura}>
        <RotuloDoCartao texto="Fatura aberta" icone="credit-card" />
        <Text style={textos.valor}>{formatarReais(cartao.saldo)}</Text>
      </View>
      <Text style={textos.corpo}>{limiteNaTela}</Text>
      {/* Sem nenhuma data, a linha não aparece */}
      {datas.length > 0 && <Text style={textos.detalhe}>{datas.join(' · ')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
    gap: espaco.medio,
  },
  nomes: {
    gap: 2,
  },
  fatura: {
    gap: espaco.minimo,
  },
});
