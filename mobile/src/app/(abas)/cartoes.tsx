import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarContas, buscarFaturasFuturas, type Conta, type FaturasFuturas } from '@/api';
import BlocoDoCartao from '@/componentes/BlocoDoCartao';
import Carregando from '@/componentes/Carregando';
import EstadoVazio from '@/componentes/EstadoVazio';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import ProximasFaturas from '@/componentes/ProximasFaturas';
import { entradaEmCascata } from '@/movimento';
import { cantos, cores, espaco, textos } from '@/tema';
import { useCarga } from '@/useCarga';

// Tudo o que a aba Cartões precisa, vindo de duas rotas
type DadosDosCartoes = {
  contas: Conta[];
  faturasFuturas: FaturasFuturas;
};

// Busca as contas e as faturas futuras ao mesmo tempo (Promise.all dispara os
// dois pedidos juntos e espera os dois). Se qualquer um falhar, o Promise.all
// falha também, e a tela mostra o erro de sempre; "Tentar de novo" e o puxar
// para baixo chamam esta função de novo, então buscam as duas rotas.
// Fica fora do componente para ser sempre a mesma função (o useCarga pede isso).
async function buscarDadosDosCartoes(): Promise<DadosDosCartoes> {
  const [contas, faturasFuturas] = await Promise.all([buscarContas(), buscarFaturasFuturas()]);
  return { contas, faturasFuturas };
}

// Tela Cartões: um bloco por cartão de crédito, com fatura, limite e datas, e
// embaixo a estimativa das próximas faturas.
//
// Fluxo: a tela abre, busca /api/contas/ e /api/faturas-futuras/ juntas, mostra
// só as contas de tipo "cartao" (na ordem da API, por banco e nome) e, se houver
// algum cartão, a seção "Próximas faturas".
export default function CartoesScreen() {
  const { estado, recarregar, atualizar, atualizando, falhouAoAtualizar } =
    useCarga(buscarDadosDosCartoes);

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
  const cartoes = estado.dados.contas.filter((conta) => conta.tipo === 'cartao');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
      <ScrollView
        testID="rolagem-cartoes"
        style={styles.tela}
        contentContainerStyle={styles.conteudo}
        // Puxar para baixo relê as contas e as faturas futuras (sem sincronizar
        // com a Pluggy; isso continua só no Início). As cores são as do Início
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
          // Sem cartão, não há fatura futura para mostrar: a seção some
          <View style={styles.vazio}>
            <EstadoVazio icone="credit-card" texto="Nenhum cartão encontrado." />
          </View>
        ) : (
          <>
            {/* Poucos cartões, então um map simples basta; FlatList dentro de
                ScrollView não é recomendado */}
            {/* Cada bloco entra em cascata (seção 10 do guia), só na primeira
                carga: puxar para baixo não desmonta os blocos */}
            {cartoes.map((cartao, indice) => (
              <Animated.View key={cartao.id} entering={entradaEmCascata(indice)}>
                <BlocoDoCartao cartao={cartao} />
              </Animated.View>
            ))}
            <Animated.View entering={entradaEmCascata(cartoes.length)}>
              <ProximasFaturas meses={estado.dados.faturasFuturas.meses} />
            </Animated.View>
          </>
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
});
