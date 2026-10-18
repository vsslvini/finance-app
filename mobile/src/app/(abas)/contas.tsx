import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarContas, type Conta } from '@/api';
import Carregando from '@/componentes/Carregando';
import LinhaDeConta from '@/componentes/LinhaDeConta';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import { cantos, cores, espaco, textos } from '@/tema';
import { useCarga } from '@/useCarga';

// Tela Contas: todas as contas, agrupadas por banco.
//
// Fluxo: a tela abre, busca as contas em /api/contas/ e junta as que são do
// mesmo banco num grupo. O total de tudo não aparece aqui: ele já é o "Saldo"
// do Início.

type GrupoDoBanco = {
  banco: string;
  contas: Conta[];
};

// Junta contas seguidas do mesmo banco num grupo. A API já manda as contas
// ordenadas por banco, então basta comparar cada conta com o grupo anterior.
function agruparPorBanco(contas: Conta[]): GrupoDoBanco[] {
  const grupos: GrupoDoBanco[] = [];
  for (const conta of contas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo !== undefined && ultimo.banco === conta.nome_banco) {
      ultimo.contas.push(conta);
    } else {
      grupos.push({ banco: conta.nome_banco, contas: [conta] });
    }
  }
  return grupos;
}

export default function ContasScreen() {
  // buscarContas é uma função da api.ts, então é sempre a mesma (o useCarga pede isso)
  const { estado, recarregar, atualizar, atualizando, falhouAoAtualizar } =
    useCarga(buscarContas);

  // A borda de baixo fica com a barra de abas, que já cuida da área segura
  if (estado.tipo === 'carregando') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
        <Carregando texto="Carregando as contas..." />
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

  // Calculado durante a renderização, sem guardar uma cópia no estado
  const grupos = agruparPorBanco(estado.dados);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
      <ScrollView
        testID="rolagem-contas"
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
            Contas
          </Text>
          {falhouAoAtualizar && (
            // accessibilityLiveRegion faz o leitor de tela do Android ler o
            // aviso assim que ele aparece, sem a pessoa precisar procurar
            <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.aviso]}>
              Não foi possível atualizar agora.
            </Text>
          )}
        </View>

        {grupos.length === 0 ? (
          <View style={styles.cartao}>
            <Text style={[textos.corpo, styles.textoVazio]}>Nenhuma conta encontrada.</Text>
          </View>
        ) : (
          // Poucas contas, então um map simples basta; FlatList dentro de
          // ScrollView não é recomendado. A key usa o índice junto do banco
          // para não repetir, caso a API um dia mande o mesmo banco separado
          grupos.map((grupo, indice) => (
            <View key={`${grupo.banco}-${indice}`} style={styles.grupo}>
              <Text accessibilityRole="header" style={textos.subtitulo}>
                {grupo.banco}
              </Text>
              <View style={styles.cartao}>
                {grupo.contas.map((conta, posicao) => (
                  <LinhaDeConta key={conta.id} conta={conta} comDivisoria={posicao > 0} />
                ))}
              </View>
            </View>
          ))
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
  grupo: {
    // Nome do banco perto do seu cartão, e os grupos separados pelo gap do conteúdo
    gap: espaco.pequeno,
    marginTop: espaco.pequeno,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    // Sem respiro em cima e embaixo: cada linha já tem o seu (paddingVertical)
    paddingHorizontal: espaco.grande,
  },
  textoVazio: {
    color: cores.textoSecundario,
    textAlign: 'center',
    paddingVertical: espaco.grande,
  },
});
