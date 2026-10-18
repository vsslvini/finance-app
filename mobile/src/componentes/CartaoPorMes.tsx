// Cartão "Por mês" da aba "A pagar": o planejamento dos próximos 6 meses, feito
// pelo backend (fixos e parcelas de dívida de cada mês).
//
// Fluxo: a aba já buscou /api/a-pagar/ e passa os dados para cá. Este componente
// só desenha: em cima, a renda (tocar nela abre a folha para editar); depois uma
// linha por mês com nome, total, detalhe, o que falta pagar e, quando há renda,
// a porcentagem da renda com uma barra.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { APagarPorMes, MesAPagar } from '@/api';
import BarraDeProgresso from '@/componentes/BarraDeProgresso';
import { formatarNumero, formatarReais, tituloDoMes } from '@/formatacao';
import { cantos, cores, espaco, textos, toque } from '@/tema';

type CartaoPorMesProps = {
  dados: APagarPorMes;
  aoEditarRenda: () => void; // toque na linha da renda
};

// "38.7" -> "38,7" (o backend manda com ponto)
function comVirgula(percentual: string): string {
  return percentual.replace('.', ',');
}

// Texto lido pelo leitor de tela para um mês inteiro
function rotuloDoMes(mes: MesAPagar): string {
  const partes = [
    `${tituloDoMes(mes.mes)}: ${formatarNumero(mes.total)} reais`,
    `falta ${formatarNumero(mes.falta)} reais`,
  ];
  if (mes.percentual_da_renda !== null) {
    partes.push(`${comVirgula(mes.percentual_da_renda)}% da renda`);
  }
  return partes.join(', ');
}

export default function CartaoPorMes({ dados, aoEditarRenda }: CartaoPorMesProps) {
  const { renda_mensal: renda, meses } = dados;

  return (
    <View style={styles.cartao}>
      <Text accessibilityRole="header" style={textos.subtitulo}>
        Por mês
      </Text>

      <Pressable
        accessibilityRole="button"
        // O nome lido é o próprio texto visível (quem vê e quem ouve acham o
        // mesmo botão); a dica diz o que o toque faz
        accessibilityHint={renda === null ? 'Toque para informar' : 'Toque para editar'}
        onPress={aoEditarRenda}
        style={({ pressed }) => [styles.renda, pressed && toque.apertadoIcone]}
      >
        <Text style={[textos.corpo, styles.textoDaRenda]}>
          {renda === null
            ? 'Informe sua renda para ver quanto isso tira dela.'
            : `Renda: ${formatarReais(renda)}`}
        </Text>
      </Pressable>

      {/* Sempre 6 meses, então um map simples basta (a aba já é um ScrollView) */}
      {meses.map((mes, indice) => (
        <View
          key={mes.mes}
          accessible
          accessibilityLabel={rotuloDoMes(mes)}
          style={[styles.mes, indice > 0 && styles.divisoria]}
        >
          <View style={styles.linha}>
            <View style={styles.esquerda}>
              <Text style={textos.corpo}>{tituloDoMes(mes.mes)}</Text>
              <Text style={textos.detalhe}>
                {`Fixos ${formatarReais(mes.fixos)} · Dívidas ${formatarReais(mes.dividas)}`}
              </Text>
            </View>
            <View style={styles.direita}>
              <Text style={textos.valor}>{formatarReais(mes.total)}</Text>
              <Text style={textos.detalhe}>{`Falta ${formatarReais(mes.falta)}`}</Text>
            </View>
          </View>

          {mes.percentual_da_renda !== null && (
            <>
              <Text style={textos.detalhe}>{`${comVirgula(mes.percentual_da_renda)}% da renda`}</Text>
              {/* A barra nunca passa de 100; o texto acima mostra o número real */}
              <BarraDeProgresso
                porcentagem={Math.min(Math.round(Number(mes.percentual_da_renda)), 100)}
              />
            </>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
  },
  renda: {
    // Área de toque de pelo menos 44 de altura
    minHeight: 44,
    justifyContent: 'center',
  },
  textoDaRenda: {
    color: cores.textoSecundario,
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
    alignItems: 'flex-start',
    gap: espaco.medio,
  },
  esquerda: {
    // flex: 1 deixa o texto quebrar a linha sem empurrar o total para fora
    flex: 1,
    gap: 2,
  },
  direita: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
