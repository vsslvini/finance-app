// Seção "Guardado" da tela Início: quanto há guardado nos investimentos, quanto
// entrou neste mês e, se houver plano, a barra de progresso até o mês alvo.
// A seção inteira é um botão, que abre a folha "Plano de guardar".
import { StyleSheet, Text, View } from 'react-native';

import type { Guardado } from '@/api';
import BarraDeProgresso from '@/componentes/BarraDeProgresso';
import RotuloDoCartao from '@/componentes/RotuloDoCartao';
import Tocavel from '@/componentes/Tocavel';
import { tituloDoMes } from '@/formatacao';
import { cantos, cores, espaco, textos } from '@/tema';
import { useDinheiro, VALOR_ESCONDIDO } from '@/valoresVisiveis';

// "500.00" -> "+ R$ 500,00 este mês"; "-100.00" -> "- R$ 100,00 este mês"
// "reais" é a função do useDinheiro (formatarReais ou "R$ ••••")
function textoDoMes(esteMes: string, reais: (valor: string) => string): string {
  // formatarReais já põe o "- " nos negativos; o "+ " fica por nossa conta
  const sinal = esteMes.startsWith('-') ? '' : '+ ';
  return `${sinal}${reais(esteMes)} este mês`;
}

type SecaoGuardadoProps = {
  guardado: Guardado;
  aoTocar: () => void; // abre a folha "Plano de guardar"
};

export default function SecaoGuardado({ guardado, aoTocar }: SecaoGuardadoProps) {
  const { total, este_mes, plano, previsto, progresso } = guardado;
  // Formata os valores ou mostra "R$ ••••", conforme o olho do Início
  // (Módulo 19b; ver valoresVisiveis.tsx)
  const { visiveis, reais, rotulo } = useDinheiro();
  const negativo = este_mes.startsWith('-');
  // Com plano, o backend manda o mês alvo e o previsto; sem plano, os dois são null
  const mesAlvo = plano?.mes_alvo ?? null;

  return (
    <Tocavel
      accessibilityRole="button"
      accessibilityLabel={rotulo('Guardado', total)}
      accessibilityHint="Toque para editar o plano de guardar"
      onPress={aoTocar}
      style={styles.cartao}
    >
      <RotuloDoCartao texto="Guardado" icone="piggy-bank" />
      <Text style={textos.valor}>{reais(total)}</Text>
      {/* Cor e sinal juntos: a cor nunca é a única pista. Com os valores
          escondidos, sem sinal e sem cor, para não contar se subiu ou desceu */}
      {visiveis ? (
        <Text style={[textos.detalhe, negativo ? styles.negativo : styles.positivo]}>
          {textoDoMes(este_mes, reais)}
        </Text>
      ) : (
        <Text style={textos.detalhe}>{`${VALOR_ESCONDIDO} este mês`}</Text>
      )}

      {previsto !== null && mesAlvo !== null ? (
        <View style={styles.meta}>
          {/* Trilho cinza com a parte roxa por cima, do tamanho do progresso
              (a barra nunca passa da largura do cartão, mesmo acima de 100) */}
          <BarraDeProgresso porcentagem={progresso ?? 0} rotulo="Progresso do plano de guardar" />
          <Text style={textos.rotulo}>
            {`${reais(total)} de ${reais(previsto)} previstos em ${tituloDoMes(mesAlvo).toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <Text style={[textos.rotulo, styles.convite]}>Toque para criar um plano de guardar</Text>
      )}
    </Tocavel>
  );
}

const styles = StyleSheet.create({
  cartao: {
    // Mesmo cartão da tela Início (superficie, canto 16, respiro 16)
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
    gap: espaco.minimo,
  },
  positivo: {
    color: cores.positivo,
  },
  negativo: {
    color: cores.negativo,
  },
  meta: {
    gap: espaco.pequeno,
    marginTop: espaco.pequeno,
  },
  convite: {
    // Roxo do acento, como um link: mostra que o cartão é tocável
    color: cores.acento,
    marginTop: espaco.minimo,
  },
});
