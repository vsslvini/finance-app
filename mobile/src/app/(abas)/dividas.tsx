import { Lucide } from '@react-native-vector-icons/lucide';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarDividas, type Divida } from '@/api';
import Botao from '@/componentes/Botao';
import CartaoDeDivida from '@/componentes/CartaoDeDivida';
import Carregando from '@/componentes/Carregando';
import EstadoVazio from '@/componentes/EstadoVazio';
import FolhaDaDivida from '@/componentes/FolhaDaDivida';
import FolhaDeNovaDivida from '@/componentes/FolhaDeNovaDivida';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import { cantos, cores, espaco, textos } from '@/tema';
import { useCarga } from '@/useCarga';

// Tela Dívidas: um cartão por dívida, com o que falta pagar e a próxima parcela.
//
// Fluxo: a tela abre, busca /api/dividas/ e mostra os cartões. Tocar num cartão
// abre a folha da dívida (parcelas, marcar como paga, apagar); "Nova dívida" abre
// a folha de cadastro. Ao fechar uma folha depois de uma mudança, a lista é lida
// de novo.
export default function DividasScreen() {
  const { estado, recarregar, atualizar, atualizando, falhouAoAtualizar } =
    useCarga(buscarDividas);
  const [novaAberta, setNovaAberta] = useState(false);
  // A dívida cuja folha está aberta (null = nenhuma)
  const [aberta, setAberta] = useState<Divida | null>(null);

  // A borda de baixo fica com a barra de abas, que já cuida da área segura
  if (estado.tipo === 'carregando') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
        <Carregando texto="Carregando as dívidas..." />
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

  const dividas = estado.dados;
  // Calculado durante a renderização, sem estado extra: quantas parcelas atrasadas
  const atrasadas = dividas.reduce(
    (soma, divida) => soma + divida.parcelas.filter((parcela) => parcela.atrasada).length,
    0,
  );

  // A nova dívida foi salva: fecha a folha e relê a lista (sem tela de carregando)
  function aoSalvarNova() {
    setNovaAberta(false);
    atualizar();
  }

  // Fechar a folha da dívida: só relê se alguma parcela mudou
  function aoFecharDivida(mudou: boolean) {
    setAberta(null);
    if (mudou) {
      atualizar();
    }
  }

  // A dívida foi apagada: fecha a folha e relê a lista
  function aoApagarDivida() {
    setAberta(null);
    atualizar();
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
      <ScrollView
        testID="rolagem-dividas"
        style={styles.tela}
        contentContainerStyle={styles.conteudo}
        // Puxar para baixo relê só as dívidas (as cores são as do Início)
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
            Dívidas
          </Text>
          {falhouAoAtualizar && (
            // accessibilityLiveRegion faz o leitor de tela do Android ler o
            // aviso assim que ele aparece, sem a pessoa precisar procurar
            <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.avisoCurto]}>
              Não foi possível atualizar agora.
            </Text>
          )}
        </View>

        {atrasadas > 0 && (
          <View style={styles.aviso}>
            {/* Ícone só de enfeite: o texto do aviso já explica tudo */}
            <Lucide
              name="triangle-alert"
              size={18}
              color={cores.aviso}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={[textos.corpo, styles.textoAviso]}>
              {`${atrasadas} ${atrasadas === 1 ? 'parcela atrasada' : 'parcelas atrasadas'}. Se já pagou, marque como paga na dívida.`}
            </Text>
          </View>
        )}

        <Botao titulo="Nova dívida" tipo="principal" aoTocar={() => setNovaAberta(true)} />

        {dividas.length === 0 ? (
          <View style={styles.vazio}>
            <EstadoVazio icone="hand-coins" texto="Nenhuma dívida cadastrada." />
          </View>
        ) : (
          // Poucas dívidas, então um map simples basta; FlatList dentro de
          // ScrollView não é recomendado
          dividas.map((divida) => (
            <CartaoDeDivida key={divida.id} divida={divida} aoTocar={() => setAberta(divida)} />
          ))
        )}
      </ScrollView>

      {novaAberta && (
        <FolhaDeNovaDivida aoCancelar={() => setNovaAberta(false)} aoSalvar={aoSalvarNova} />
      )}

      {aberta !== null && (
        <FolhaDaDivida divida={aberta} aoFechar={aoFecharDivida} aoApagar={aoApagarDivida} />
      )}
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
  avisoCurto: {
    color: cores.aviso,
  },
  aviso: {
    // Ícone e texto lado a lado
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.pequeno,
    backgroundColor: cores.avisoFundo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    borderRadius: cantos.aviso,
    padding: espaco.medio,
  },
  textoAviso: {
    // flex: 1 deixa o texto quebrar a linha ao lado do ícone
    flex: 1,
    color: cores.aviso,
  },
  vazio: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
  },
});
