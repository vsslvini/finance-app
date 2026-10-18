// Cartão "Gasto previsto" do Início: dois blocos, o que ainda falta pagar neste
// mês e o que está previsto para o mês que vem, cada um com o detalhe de onde
// vem o número. Só leitura: tudo já vem calculado pelo backend.
import { Lucide } from '@react-native-vector-icons/lucide';
import { StyleSheet, Text, View } from 'react-native';

import type { MesAtualPrevisto, MesPrevisto, Previsto } from '@/api';
import { formatarReais, nomeCurtoDoMes, rotuloEmReais } from '@/formatacao';
import { cantos, cores, espaco, textos } from '@/tema';

type CartaoDoPrevistoProps = {
  previsto: Previsto;
};

type LinhaDeDetalhe = {
  chave: string;
  nome: string; // "Gastos fixos"
  valor: string;
  aviso?: boolean; // true = cor de aviso (parcelas atrasadas)
};

const ZERO = '0.00';

// Monta só as linhas com valor diferente de zero, na ordem do contrato:
// faturas (uma por cartão), gastos fixos, dívidas e, no mês atual, atrasadas
function linhasDoMes(mes: MesPrevisto | MesAtualPrevisto): LinhaDeDetalhe[] {
  const linhas: LinhaDeDetalhe[] = [];
  for (const fatura of mes.faturas) {
    if (fatura.valor !== ZERO) {
      linhas.push({
        chave: `fatura-${fatura.conta}`,
        nome: `Fatura ${fatura.nome_banco}`,
        valor: fatura.valor,
      });
    }
  }
  if (mes.fixos !== ZERO) {
    linhas.push({ chave: 'fixos', nome: 'Gastos fixos', valor: mes.fixos });
  }
  if (mes.dividas !== ZERO) {
    linhas.push({ chave: 'dividas', nome: 'Dívidas', valor: mes.dividas });
  }
  if ('atrasadas' in mes && mes.atrasadas !== ZERO) {
    linhas.push({
      chave: 'atrasadas',
      nome: 'Parcelas atrasadas',
      valor: mes.atrasadas,
      aviso: true,
    });
  }
  return linhas;
}

type BlocoProps = {
  titulo: string; // "Falta pagar em outubro"
  total: string;
  linhas: LinhaDeDetalhe[];
  textoVazio: string; // "Nada pendente."
  comDivisoria: boolean;
};

function Bloco({ titulo, total, linhas, textoVazio, comDivisoria }: BlocoProps) {
  // O rótulo lê o bloco inteiro de uma vez, com "reais" em vez de "R$"
  const frases = [rotuloEmReais(titulo, total)];
  if (linhas.length === 0) {
    frases.push(textoVazio.replace(/\.$/, ''));
  } else {
    for (const linha of linhas) {
      frases.push(rotuloEmReais(linha.nome, linha.valor));
    }
  }
  const rotulo = `${frases.join('. ')}.`;

  return (
    <View
      accessible
      accessibilityLabel={rotulo}
      style={[styles.bloco, comDivisoria && styles.blocoComDivisoria]}
    >
      <Text style={textos.rotulo}>{titulo}</Text>
      <Text style={textos.valor}>{formatarReais(total)}</Text>
      {linhas.length === 0 ? (
        <Text style={textos.detalhe}>{textoVazio}</Text>
      ) : (
        linhas.map((linha) => (
          <Text key={linha.chave} style={[textos.detalhe, linha.aviso && styles.textoAviso]}>
            {`${linha.nome}: ${formatarReais(linha.valor)}`}
          </Text>
        ))
      )}
    </View>
  );
}

export default function CartaoDoPrevisto({ previsto }: CartaoDoPrevistoProps) {
  const { mes_atual: atual, proximo_mes: proximo } = previsto;

  return (
    <View style={styles.cartao}>
      <View style={styles.cabecalho}>
        <Lucide
          name="calendar-clock"
          size={16}
          color={cores.textoSecundario}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text accessibilityRole="header" style={textos.rotulo}>
          Gasto previsto
        </Text>
      </View>
      <Bloco
        titulo={`Falta pagar em ${nomeCurtoDoMes(atual.mes)}`}
        total={atual.total}
        linhas={linhasDoMes(atual)}
        textoVazio="Nada pendente."
        comDivisoria={false}
      />
      <Bloco
        titulo={`Previsto para ${nomeCurtoDoMes(proximo.mes)}`}
        total={proximo.total}
        linhas={linhasDoMes(proximo)}
        textoVazio="Nada previsto."
        comDivisoria
      />
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
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.minimo,
  },
  bloco: {
    gap: espaco.minimo,
  },
  blocoComDivisoria: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    paddingTop: espaco.medio,
  },
  textoAviso: {
    color: cores.aviso,
  },
});
