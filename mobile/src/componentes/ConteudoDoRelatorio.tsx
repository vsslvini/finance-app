// O corpo da tela Relatório, com o relatório de um mês já carregado: os três
// cartões (Entrou, Saiu e Saldo do mês), os gastos por categoria e os maiores
// gastos, tudo numa rolagem com "puxar para baixo".
//
// Este componente só desenha. Quem busca os dados (e sabe reler) é quem o usa:
// a tela, no mês atual, ou o RelatorioDoMes, nos meses escolhidos pelas setas.
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Relatorio } from '@/api';
import ItemDeTransacao from '@/componentes/ItemDeTransacao';
import LinhaDeCategoria from '@/componentes/LinhaDeCategoria';
import RotuloDoCartao from '@/componentes/RotuloDoCartao';
import { formatarReais, rotuloEmReais } from '@/formatacao';
import { cantos, cores, espaco, textos } from '@/tema';

type ConteudoDoRelatorioProps = {
  relatorio: Relatorio;
  atualizar: () => void; // puxar para baixo: relê o mesmo mês
  atualizando: boolean; // mostra o indicador do puxar para baixo
  falhouAoAtualizar: boolean; // mostra o aviso curto
};

export default function ConteudoDoRelatorio({
  relatorio,
  atualizar,
  atualizando,
  falhouAoAtualizar,
}: ConteudoDoRelatorioProps) {
  const { entradas, saidas, saldo_do_mes, total_gastos, gastos_por_categoria, maiores_gastos } =
    relatorio;
  // Saldo do mês negativo: o formatarReais já põe o "- "; positivo ganha "+ "
  const saldoNegativo = saldo_do_mes.startsWith('-');
  const saldoNaTela = saldoNegativo
    ? formatarReais(saldo_do_mes)
    : `+ ${formatarReais(saldo_do_mes)}`;
  // Sem categorias não há gastos no mês (as duas listas vêm vazias juntas)
  const semGastos = gastos_por_categoria.length === 0;

  return (
    <ScrollView
      testID="rolagem-relatorio"
      style={styles.rolagem}
      contentContainerStyle={styles.conteudo}
      // Puxar para baixo só relê o relatório deste mês (sem sincronizar com a
      // Pluggy; isso fica no Início). As cores são as mesmas do Início
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={atualizar}
          tintColor={cores.acento}
          colors={[cores.acento]}
          progressBackgroundColor={cores.superficie}
        />
      }
    >
      {falhouAoAtualizar && (
        // accessibilityLiveRegion faz o leitor de tela do Android ler o aviso
        // assim que ele aparece, sem a pessoa precisar procurar
        <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.aviso]}>
          Não foi possível atualizar agora.
        </Text>
      )}

      {/* Os números do mês: os mesmos do Início (regra da conta corrente) */}
      <View style={styles.linha}>
        <View
          accessible
          accessibilityLabel={rotuloEmReais('Entrou no mês', entradas)}
          style={[styles.cartao, styles.cartaoMetade]}
        >
          <RotuloDoCartao texto="Entrou" icone="arrow-down-left" corDoIcone={cores.positivo} />
          <Text style={[textos.valor, styles.positivo]}>{`+ ${formatarReais(entradas)}`}</Text>
        </View>
        <View
          accessible
          accessibilityLabel={rotuloEmReais('Saiu no mês', saidas)}
          style={[styles.cartao, styles.cartaoMetade]}
        >
          <RotuloDoCartao texto="Saiu" icone="arrow-up-right" corDoIcone={cores.negativo} />
          <Text style={[textos.valor, styles.negativo]}>{`- ${formatarReais(saidas)}`}</Text>
        </View>
      </View>
      <View
        accessible
        accessibilityLabel={rotuloEmReais('Saldo do mês', saldo_do_mes)}
        style={styles.cartao}
      >
        <RotuloDoCartao texto="Saldo do mês" icone="scale" />
        {/* Cor e sinal juntos: a cor nunca é a única pista */}
        <Text style={[textos.valor, saldoNegativo ? styles.negativo : styles.positivo]}>
          {saldoNaTela}
        </Text>
      </View>

      {semGastos ? (
        <View style={styles.cartao}>
          <Text style={[textos.corpo, styles.textoVazio]}>Nenhum gasto neste mês.</Text>
        </View>
      ) : (
        <>
          {/* Gastos por categoria: inclui as compras do cartão, por isso o
              total pode ser diferente do "Saiu" (ver docs/planos/modulo-9-relatorio.md) */}
          <View style={styles.cabecalhoDaSecao}>
            <Text accessibilityRole="header" style={textos.subtitulo}>
              Gastos por categoria
            </Text>
            <Text style={textos.detalhe}>
              Inclui as compras do cartão; por isso pode ser diferente do Saiu.
            </Text>
            <Text style={textos.corpo}>{`Total de gastos: ${formatarReais(total_gastos)}`}</Text>
          </View>
          <View style={[styles.cartao, styles.cartaoDeLista]}>
            {/* Poucas categorias por mês, então um map simples basta;
                FlatList dentro de ScrollView não é recomendado */}
            {gastos_por_categoria.map((categoria, indice) => (
              <LinhaDeCategoria
                // O nome exibido é único na lista (o backend agrupa por ele)
                key={categoria.categoria}
                categoria={categoria}
                comDivisoria={indice > 0}
              />
            ))}
          </View>

          {/* Maiores gastos: no visual da lista de Transações, sem toque */}
          <Text accessibilityRole="header" style={[textos.subtitulo, styles.subtitulo]}>
            Maiores gastos
          </Text>
          <View>
            {maiores_gastos.map((gasto, indice) => (
              <ItemDeTransacao
                key={gasto.id}
                transacao={gasto}
                comDivisoria={indice > 0}
                primeira={indice === 0}
                ultima={indice === maiores_gastos.length - 1}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rolagem: {
    flex: 1,
  },
  conteudo: {
    paddingHorizontal: espaco.grande,
    paddingBottom: espaco.grande,
    gap: espaco.medio,
  },
  aviso: {
    color: cores.aviso,
  },
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.medio,
  },
  cartao: {
    // Mesmo cartão da tela Início (superficie, canto 16, respiro 16)
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
    gap: espaco.minimo,
  },
  cartaoMetade: {
    // Cada cartão ocupa metade da linha; com fonte grande, vai para baixo
    flexGrow: 1,
    flexBasis: 150,
  },
  cartaoDeLista: {
    // As linhas já têm o próprio respiro em cima e embaixo
    paddingVertical: espaco.minimo,
    gap: 0,
  },
  positivo: {
    color: cores.positivo,
  },
  negativo: {
    color: cores.negativo,
  },
  textoVazio: {
    color: cores.textoSecundario,
    textAlign: 'center',
  },
  cabecalhoDaSecao: {
    // Título, frase e total juntos, mais perto entre si do que dos blocos
    gap: espaco.minimo,
    marginTop: espaco.pequeno,
  },
  subtitulo: {
    marginTop: espaco.pequeno,
  },
});
