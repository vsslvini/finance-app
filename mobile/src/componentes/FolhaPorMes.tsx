// Folha "Por mês": o planejamento dos próximos 6 meses, feito pelo backend
// (fixos e parcelas de dívida de cada mês). Abre ao tocar no cartão resumido
// da aba "A pagar".
//
// Fluxo: a aba já buscou /api/a-pagar/ e passa os dados para cá. Esta folha só
// desenha: a renda com o botão para informar ou editar, e uma linha por mês com
// nome, total, detalhe, o que falta pagar e, quando há renda, a porcentagem da
// renda com uma barra. A lista rola se não couber na tela.
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { APagarPorMes, MesAPagar } from '@/api';
import BarraDeProgresso from '@/componentes/BarraDeProgresso';
import Botao from '@/componentes/Botao';
import Folha from '@/componentes/Folha';
import { formatarNumero, formatarReais, tituloDoMes } from '@/formatacao';
import { cores, espaco, textos } from '@/tema';

type FolhaPorMesProps = {
  dados: APagarPorMes;
  aoEditarRenda: () => void; // "Editar renda" / "Informar renda"
  aoFechar: () => void;
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

export default function FolhaPorMes({ dados, aoEditarRenda, aoFechar }: FolhaPorMesProps) {
  const { renda_mensal: renda, meses } = dados;

  return (
    <Folha aoFechar={aoFechar} alturaMaxima="85%">
      <Text accessibilityRole="header" style={textos.subtitulo}>
        Por mês
      </Text>

      <View style={styles.rendaLinha}>
        <Text style={[textos.corpo, styles.textoDaRenda]}>
          {renda === null ? 'Sem renda informada.' : `Renda: ${formatarReais(renda)}`}
        </Text>
        <Botao
          titulo={renda === null ? 'Informar renda' : 'Editar renda'}
          tipo="secundario"
          aoTocar={aoEditarRenda}
        />
      </View>

      {/* Sempre 6 meses; a lista rola se a tela for pequena */}
      <ScrollView style={styles.lista}>
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
      </ScrollView>

      <Botao titulo="Fechar" tipo="secundario" aoTocar={aoFechar} />
    </Folha>
  );
}

const styles = StyleSheet.create({
  rendaLinha: {
    gap: espaco.pequeno,
  },
  textoDaRenda: {
    color: cores.textoSecundario,
  },
  lista: {
    // flexShrink deixa a lista encolher dentro da altura máxima e rolar
    flexShrink: 1,
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
