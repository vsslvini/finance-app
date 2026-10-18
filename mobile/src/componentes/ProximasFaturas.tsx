// Seção "Próximas faturas" da aba Cartões: a estimativa das faturas dos próximos
// 6 meses, feita pelo backend a partir das compras parceladas.
//
// Fluxo: a tela Cartões já buscou /api/faturas-futuras/ e passa a lista de
// meses para cá. Este componente só desenha: uma linha por mês (nome do mês à
// esquerda, total à direita) e, quando o mês tem mais de um cartão, uma linha
// pequena por cartão embaixo.
import { StyleSheet, Text, View } from 'react-native';

import type { MesFuturo } from '@/api';
import { formatarReais, rotuloEmReais, tituloDoMes } from '@/formatacao';
import { cantos, cores, espaco, textos } from '@/tema';

type ProximasFaturasProps = {
  meses: MesFuturo[]; // os 6 meses, na ordem que o backend mandou
};

export default function ProximasFaturas({ meses }: ProximasFaturasProps) {
  // Calculado durante a renderização: se nenhum mês tem parcela, mostramos uma
  // frase no lugar das linhas, em vez de seis "R$ 0,00" seguidos.
  // Aqui o Number é seguro: só comparamos com zero, sem fazer conta com
  // centavos (a regra de não converter dinheiro vale para mostrar e somar).
  // Com a lista vazia, o every devolve true e a frase também aparece.
  const semParcelas = meses.every((mes) => Number(mes.total) === 0);

  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <Text accessibilityRole="header" style={textos.subtitulo}>
          Próximas faturas
        </Text>
        <Text style={textos.detalhe}>Estimativa pelas compras parceladas que a Pluggy enviou.</Text>
      </View>

      <View style={styles.cartao}>
        {semParcelas ? (
          <Text style={[textos.corpo, styles.textoVazio]}>Nenhuma parcela futura encontrada.</Text>
        ) : (
          // Sempre 6 meses, então um map simples basta (a tela já é um ScrollView)
          meses.map((mes, indice) => (
            <View key={mes.mes} style={[styles.mes, indice > 0 && styles.divisoria]}>
              {/* Nome do mês e total formam um bloco só para o leitor de tela,
                  que lê "Novembro de 2026: 231,26 reais" */}
              <View
                accessible
                accessibilityLabel={rotuloEmReais(tituloDoMes(mes.mes), mes.total)}
                style={styles.linha}
              >
                <Text style={[textos.corpo, styles.nomeDoMes]}>{tituloDoMes(mes.mes)}</Text>
                <Text style={textos.valor}>{formatarReais(mes.total)}</Text>
              </View>

              {/* Com um cartão só, o detalhe repetiria o total da linha de cima.
                  As linhas ficam fora do bloco acima para o leitor de tela
                  conseguir ler cada cartão */}
              {mes.cartoes.length > 1 &&
                mes.cartoes.map((cartao) => (
                  <Text
                    key={cartao.conta}
                    accessibilityLabel={rotuloEmReais(cartao.nome_banco, cartao.total)}
                    style={textos.detalhe}
                  >
                    {`${cartao.nome_banco}: ${formatarReais(cartao.total)}`}
                  </Text>
                ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    // Um respiro a mais separa a seção dos blocos dos cartões acima
    marginTop: espaco.pequeno,
    gap: espaco.medio,
  },
  cabecalho: {
    gap: espaco.minimo,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    paddingHorizontal: espaco.grande,
    // Pouco respiro em cima e embaixo: cada mês já tem o seu (ver "mes")
    paddingVertical: espaco.minimo,
  },
  mes: {
    paddingVertical: espaco.medio,
    gap: espaco.minimo,
  },
  divisoria: {
    // Divisória de 1 entre as linhas, como na lista de gastos (docs/design.md)
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.medio,
  },
  nomeDoMes: {
    // flex: 1 deixa o nome do mês quebrar a linha (fonte grande do sistema)
    // sem empurrar o valor para fora do cartão
    flex: 1,
  },
  textoVazio: {
    color: cores.textoSecundario,
    textAlign: 'center',
    paddingVertical: espaco.medio,
  },
});
