// Cartão de uma dívida na aba Dívidas: para quem, motivo, quanto falta, barra de
// parcelas pagas e a próxima parcela. Tocar abre a folha da dívida.
import { Pressable, StyleSheet, Text } from 'react-native';

import type { Divida } from '@/api';
import BarraDeProgresso from '@/componentes/BarraDeProgresso';
import { formatarNumero, formatarReais, mesPorExtenso } from '@/formatacao';
import { cantos, cores, espaco, textos } from '@/tema';

type CartaoDeDividaProps = {
  divida: Divida;
  aoTocar: () => void;
};

export default function CartaoDeDivida({ divida, aoTocar }: CartaoDeDividaProps) {
  const { proxima_parcela: proxima } = divida;
  const motivo = divida.motivo.trim();

  // A porcentagem sai da conta durante a renderização, arredondada para baixo
  const porcentagem =
    divida.total_parcelas > 0
      ? Math.floor((divida.parcelas_pagas / divida.total_parcelas) * 100)
      : 0;

  // A última linha, e a mesma informação em versão para o leitor de tela
  let ultimaLinha: string;
  let fraseDaProxima: string;
  if (proxima === null) {
    ultimaLinha = 'Tudo pago';
    fraseDaProxima = 'Tudo pago.';
  } else if (proxima.atrasada) {
    ultimaLinha = `Atrasada: ${formatarReais(proxima.valor)} de ${mesPorExtenso(proxima.mes)}`;
    fraseDaProxima = `Parcela atrasada: ${formatarNumero(proxima.valor)} reais de ${mesPorExtenso(proxima.mes)}.`;
  } else {
    ultimaLinha = `Próxima: ${formatarReais(proxima.valor)} em ${mesPorExtenso(proxima.mes)}`;
    fraseDaProxima = `Próxima parcela: ${formatarNumero(proxima.valor)} reais em ${mesPorExtenso(proxima.mes)}.`;
  }

  const trechoDoMotivo = motivo === '' ? '' : `, ${motivo}`;
  const rotulo =
    `Dívida com ${divida.credor}${trechoDoMotivo}. ` +
    `Falta ${formatarNumero(divida.valor_restante)} reais de ${formatarNumero(divida.valor_total)} reais. ` +
    `${divida.parcelas_pagas} de ${divida.total_parcelas} parcelas pagas. ` +
    fraseDaProxima;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityHint="Toque para ver as parcelas"
      onPress={aoTocar}
      style={({ pressed }) => [styles.cartao, pressed && styles.apertado]}
    >
      <Text style={textos.valor}>{divida.credor}</Text>
      {motivo !== '' && <Text style={textos.detalhe}>{motivo}</Text>}
      <Text style={textos.rotulo}>
        {`Falta ${formatarReais(divida.valor_restante)} de ${formatarReais(divida.valor_total)}`}
      </Text>
      <BarraDeProgresso porcentagem={porcentagem} />
      <Text style={textos.rotulo}>
        {`${divida.parcelas_pagas} de ${divida.total_parcelas} parcelas pagas`}
      </Text>
      <Text style={[textos.detalhe, proxima !== null && proxima.atrasada && styles.textoAtrasada]}>
        {ultimaLinha}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
    gap: espaco.pequeno,
  },
  apertado: {
    opacity: 0.7,
  },
  textoAtrasada: {
    color: cores.aviso,
  },
});
