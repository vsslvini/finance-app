import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarContas } from '@/api';
import BlocoDoCartao from '@/componentes/BlocoDoCartao';
import Carregando from '@/componentes/Carregando';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import { cantos, cores, espaco, textos } from '@/tema';
import { useCarga } from '@/useCarga';

// Tela Cartões: um bloco por cartão de crédito, com fatura, limite e datas.
//
// Fluxo: a tela abre, busca todas as contas em /api/contas/ e mostra só as de
// tipo "cartao", na ordem que a API mandou (por banco e nome).
export default function CartoesScreen() {
  // buscarContas é uma função da api.ts, então é sempre a mesma (o useCarga pede isso)
  const { estado, recarregar, atualizar, atualizando, falhouAoAtualizar } =
    useCarga(buscarContas);

  // A borda de baixo fica com a barra de abas, que já cuida da área segura
  if (estado.tipo === 'carregando') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
        <Carregando texto="Carregando os cartões..." />
      </SafeAreaView>
    );
  }

  if (estado.tipo === 'erro') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
        <MensagemDeErro erro={estado.erro} aoTentarDeNovo={recarregar} />
      </SafeAreaView>
    );
  }

  // Calculado durante a renderização: a lista de cartões sai das contas, sem
  // precisar guardar uma cópia no estado
  const cartoes = estado.dados.filter((conta) => conta.tipo === 'cartao');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
      <ScrollView
        testID="rolagem-cartoes"
        style={styles.tela}
        contentContainerStyle={styles.conteudo}
        // Puxar para baixo só relê as contas (sem sincronizar com a Pluggy;
        // isso continua só no Início). As cores são as mesmas do Início
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
        <View style={styles.cabecalho}>
          <Text accessibilityRole="header" style={textos.titulo}>
            Cartões
          </Text>
          {falhouAoAtualizar && (
            // accessibilityLiveRegion faz o leitor de tela do Android ler o
            // aviso assim que ele aparece, sem a pessoa precisar procurar
            <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.aviso]}>
              Não foi possível atualizar agora.
            </Text>
          )}
        </View>

        {cartoes.length === 0 ? (
          <View style={styles.vazio}>
            <Text style={[textos.corpo, styles.textoVazio]}>Nenhum cartão encontrado.</Text>
          </View>
        ) : (
          // Poucos cartões, então um map simples basta; FlatList dentro de
          // ScrollView não é recomendado
          cartoes.map((cartao) => <BlocoDoCartao key={cartao.id} cartao={cartao} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: espaco.grande,
    gap: espaco.medio,
  },
  cabecalho: {
    gap: espaco.minimo,
  },
  aviso: {
    color: cores.aviso,
  },
  vazio: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
  },
  textoVazio: {
    color: cores.textoSecundario,
    textAlign: 'center',
  },
});
