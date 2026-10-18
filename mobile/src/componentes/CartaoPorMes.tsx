// Cartão resumido "Por mês" da aba "A pagar": a renda, o mês que mais importa
// (o próximo com algo a pagar) e quanto os gastos fixos e as dívidas tiram da
// renda. O cartão inteiro é tocável e abre a folha com os 6 meses.
//
// Fluxo: a aba já buscou /api/a-pagar/ e passa os dados para cá. O mês em foco
// e os textos saem de contas feitas durante a renderização, sem estado.
import { Lucide } from '@react-native-vector-icons/lucide';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { APagarPorMes, MesAPagar } from '@/api';
import BarraDeProgresso from '@/componentes/BarraDeProgresso';
import { formatarReais, tituloDoMes } from '@/formatacao';
import { cantos, cores, espaco, textos, toque } from '@/tema';

type CartaoPorMesProps = {
  dados: APagarPorMes;
  aoAbrir: () => void;
};

// O mês em foco: o primeiro com algo a pagar (falta maior que zero); se nenhum
// tiver, o primeiro (o mês atual). Exportada para ser testada.
export function mesEmFoco(meses: MesAPagar[]): MesAPagar {
  return meses.find((mes) => Number(mes.falta) > 0) ?? meses[0];
}

// "24.0" -> "24,0% da renda" (o backend manda com ponto)
function textoDoPercentual(percentual: string): string {
  return `${percentual.replace('.', ',')}% da renda`;
}

type LinhaDoTipoProps = {
  nome: string;
  valor: string;
  percentual: string | null;
};

// Uma linha do cartão ("Gastos fixos" ou "Dívidas"): valor e, com renda, a % e a barra
function LinhaDoTipo({ nome, valor, percentual }: LinhaDoTipoProps) {
  return (
    <View style={styles.tipo}>
      <View style={styles.linha}>
        <Text style={textos.corpo}>{nome}</Text>
        <Text style={textos.valor}>{formatarReais(valor)}</Text>
      </View>
      {percentual !== null && (
        <>
          <Text style={textos.detalhe}>{textoDoPercentual(percentual)}</Text>
          {/* A barra nunca passa de 100; o texto acima mostra o número real */}
          <BarraDeProgresso porcentagem={Math.min(Math.round(Number(percentual)), 100)} />
        </>
      )}
    </View>
  );
}

export default function CartaoPorMes({ dados, aoAbrir }: CartaoPorMesProps) {
  const { renda_mensal: renda, meses } = dados;
  const mes = mesEmFoco(meses);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Toque para ver os 6 meses"
      onPress={aoAbrir}
      style={({ pressed }) => [styles.cartao, pressed && toque.apertado]}
    >
      <View style={styles.linha}>
        <Text accessibilityRole="header" style={textos.subtitulo}>
          Por mês
        </Text>
        {/* Ícone só de enfeite: o hint do cartão já diz que abre algo */}
        <Lucide
          name="chevron-right"
          size={20}
          color={cores.textoSecundario}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>

      <Text style={[textos.corpo, styles.textoSecundario]}>
        {renda === null
          ? 'Informe sua renda para ver quanto isso tira dela.'
          : `Renda: ${formatarReais(renda)}`}
      </Text>

      {mes !== undefined && (
        <>
          <View style={styles.linha}>
            <Text style={textos.corpo}>{tituloDoMes(mes.mes)}</Text>
            <Text style={textos.valor}>{formatarReais(mes.total)}</Text>
          </View>
          <LinhaDoTipo nome="Gastos fixos" valor={mes.fixos} percentual={mes.percentual_fixos} />
          <LinhaDoTipo nome="Dívidas" valor={mes.dividas} percentual={mes.percentual_dividas} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
    gap: espaco.medio,
  },
  textoSecundario: {
    color: cores.textoSecundario,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.medio,
  },
  tipo: {
    gap: espaco.minimo,
  },
});
