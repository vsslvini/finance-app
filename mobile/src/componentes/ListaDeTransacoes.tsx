// A área da lista da tela Transações: busca as transações de um mês e mostra
// carregando, erro, vazio ou a lista. O cabeçalho (setas e título) fica fora
// deste componente, na tela, e por isso continua parado ao trocar de mês.
//
// A tela desenha este componente com key={mes}. Quando o mês muda, a key muda
// e o React troca o componente por um novo, que começa do zero em
// "carregando". O antigo é desmontado e o useCarga ignora a resposta que ele
// ainda esperava: assim só a resposta do último mês pedido entra na tela.
//
// Tocar numa transação abre a FolhaDeCategoria. Quando a troca dá certo, a
// folha fecha e a lista é relida com o mesmo "atualizar" do puxar para baixo:
// a lista de antes fica na tela até a nova chegar, sem "Carregando...".
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { buscarTransacoes, type Transacao } from '@/api';
import Carregando from '@/componentes/Carregando';
import EstadoVazio from '@/componentes/EstadoVazio';
import FolhaDeCategoria from '@/componentes/FolhaDeCategoria';
import ItemDeTransacao from '@/componentes/ItemDeTransacao';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import { tituloDoMes } from '@/formatacao';
import { ENTRADA_DO_CONTEUDO } from '@/movimento';
import { cantos, cores, espaco, textos } from '@/tema';
import { useCarga } from '@/useCarga';

type ListaDeTransacoesProps = {
  mes: string; // "2026-10"
};

export default function ListaDeTransacoes({ mes }: ListaDeTransacoesProps) {
  // useCallback guarda a mesma função enquanto o mês não muda, como o
  // useCarga pede (senão ele buscaria de novo a cada renderização)
  const buscar = useCallback(() => buscarTransacoes(mes), [mes]);
  const { estado, recarregar, atualizar, atualizando, falhouAoAtualizar } = useCarga(buscar);
  // A transação com a folha "Categoria" aberta (null = folha fechada)
  const [transacaoAberta, setTransacaoAberta] = useState<Transacao | null>(null);

  // A troca deu certo: fecha a folha e relê o mês sem passar por "carregando"
  function aoTrocarCategoria() {
    setTransacaoAberta(null);
    atualizar();
  }

  if (estado.tipo === 'carregando') {
    return <Carregando texto="Carregando as transações..." />;
  }

  if (estado.tipo === 'erro') {
    // "Tentar de novo" busca o mesmo mês outra vez
    return <MensagemDeErro erro={estado.erro} aoTentarDeNovo={recarregar} />;
  }

  const transacoes = estado.dados;

  return (
    // FadeIn só quando este conteúdo aparece (ao trocar de mês ele é montado
    // de novo, por causa da key); puxar para baixo não repete
    <Animated.View entering={ENTRADA_DO_CONTEUDO} style={styles.area}>
      {falhouAoAtualizar && (
        // accessibilityLiveRegion faz o leitor de tela do Android ler o aviso
        // assim que ele aparece, sem a pessoa precisar procurar
        <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.aviso]}>
          Não foi possível atualizar agora.
        </Text>
      )}
      {/* FlatList (e não map) porque um mês pode ter centenas de transações:
          ela só desenha as linhas que cabem na tela */}
      <FlatList
        testID="rolagem-transacoes"
        data={transacoes}
        keyExtractor={(transacao) => String(transacao.id)}
        renderItem={({ item, index }) => (
          <ItemDeTransacao
            transacao={item}
            comDivisoria={index > 0}
            primeira={index === 0}
            ultima={index === transacoes.length - 1}
            aoTocar={() => setTransacaoAberta(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <EstadoVazio
              icone="arrow-left-right"
              texto={`Nenhuma transação em ${tituloDoMes(mes)}.`}
            />
          </View>
        }
        contentContainerStyle={styles.conteudo}
        // Puxar para baixo só relê a lista deste mês (sem sincronizar com a
        // Pluggy; isso continua só no Início). As cores são as mesmas do Início
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizar}
            tintColor={cores.acento}
            colors={[cores.acento]}
            progressBackgroundColor={cores.superficie}
          />
        }
      />

      {transacaoAberta !== null && (
        <FolhaDeCategoria
          transacao={transacaoAberta}
          aoCancelar={() => setTransacaoAberta(null)}
          aoTrocar={aoTrocarCategoria}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  aviso: {
    color: cores.aviso,
    paddingHorizontal: espaco.grande,
    paddingBottom: espaco.pequeno,
  },
  conteudo: {
    paddingHorizontal: espaco.grande,
    paddingBottom: espaco.grande,
  },
  vazio: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
  },
});
