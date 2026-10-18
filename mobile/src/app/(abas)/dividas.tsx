import { Lucide } from '@react-native-vector-icons/lucide';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  buscarDividas,
  buscarGastosFixos,
  desmarcarGastoFixoPago,
  marcarGastoFixoPago,
  type Divida,
  type GastoFixo,
} from '@/api';
import Botao from '@/componentes/Botao';
import CartaoDeDivida from '@/componentes/CartaoDeDivida';
import Carregando from '@/componentes/Carregando';
import EstadoVazio from '@/componentes/EstadoVazio';
import FolhaDaDivida from '@/componentes/FolhaDaDivida';
import FolhaDoCadastroDeDivida from '@/componentes/FolhaDoCadastroDeDivida';
import FolhaDoGastoFixo from '@/componentes/FolhaDoGastoFixo';
import LinhaDeGastoFixo from '@/componentes/LinhaDeGastoFixo';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import { mensagemDoErro } from '@/mensagens';
import { entradaEmCascata } from '@/movimento';
import { cantos, cores, espaco, textos } from '@/tema';
import { useCarga } from '@/useCarga';

// Busca os dois pedidos juntos. Fica fora do componente para ser sempre a mesma
// função entre renderizações (o useCarga depende disso). Se um falhar, o
// Promise.all falha e a tela mostra o erro.
function buscarAPagar(): Promise<[GastoFixo[], Divida[]]> {
  return Promise.all([buscarGastosFixos(), buscarDividas()]);
}

// Aba "A pagar": gastos fixos e dívidas. O arquivo e o endereço continuam
// "dividas" (/dividas) porque a aba nasceu como Dívidas; só o nome mudou.
//
// Fluxo: a tela abre, busca /api/gastos-fixos/ e /api/dividas/ e mostra as duas
// seções. Em cada gasto fixo, "Marcar pago" ou "Desmarcar" muda o pagamento do
// mês e relê a lista; tocar no gasto abre a folha para editar ou apagar. Tocar
// num cartão de dívida abre a folha da dívida (parcelas, marcar como paga,
// apagar); nela, "Editar dívida" fecha essa folha e abre a do cadastro com os
// campos preenchidos. Depois de qualquer mudança, a lista é lida de novo.
export default function DividasScreen() {
  const { estado, recarregar, atualizar, atualizando, falhouAoAtualizar } =
    useCarga(buscarAPagar);
  const [novaAberta, setNovaAberta] = useState(false);
  // A dívida cuja folha está aberta (null = nenhuma)
  const [aberta, setAberta] = useState<Divida | null>(null);
  // A dívida na folha de edição (null = nenhuma)
  const [editando, setEditando] = useState<Divida | null>(null);
  const [novoFixoAberto, setNovoFixoAberto] = useState(false);
  // O gasto fixo cuja folha está aberta (null = nenhum)
  const [fixoAberto, setFixoAberto] = useState<GastoFixo | null>(null);
  // true enquanto o pedido de marcar ou desmarcar um pagamento está em andamento
  const [marcando, setMarcando] = useState(false);
  const [erroDoPagamento, setErroDoPagamento] = useState<string | null>(null);

  // A borda de baixo fica com a barra de abas, que já cuida da área segura
  if (estado.tipo === 'carregando') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.tela}>
        <Carregando texto="Carregando o que falta pagar..." />
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

  const [gastosFixos, dividas] = estado.dados;
  // Calculado durante a renderização, sem estado extra: quantas parcelas atrasadas
  const atrasadas = dividas.reduce(
    (soma, divida) => soma + divida.parcelas.filter((parcela) => parcela.atrasada).length,
    0,
  );

  // Marca (a pagar) ou desmarca (pago manual) o pagamento do mês do gasto. Se o
  // pedido falhar, a linha continua como estava e aparece a mensagem.
  async function alternarPagamento(gasto: GastoFixo) {
    setErroDoPagamento(null);
    setMarcando(true);
    try {
      if (gasto.este_mes.situacao === 'a_pagar') {
        await marcarGastoFixoPago(gasto.id, gasto.este_mes.mes);
      } else {
        await desmarcarGastoFixoPago(gasto.id, gasto.este_mes.mes);
      }
      await atualizar();
    } catch (erroDaApi) {
      setErroDoPagamento(mensagemDoErro(erroDaApi));
    } finally {
      setMarcando(false);
    }
  }

  // O gasto fixo foi salvo ou apagado: fecha a folha e relê a lista
  function aoSalvarFixo() {
    setNovoFixoAberto(false);
    setFixoAberto(null);
    atualizar();
  }

  // A dívida (nova ou editada) foi salva: fecha a folha e relê a lista (sem
  // tela de carregando)
  function aoSalvarDivida() {
    setNovaAberta(false);
    setEditando(null);
    atualizar();
  }

  // "Editar dívida" na folha das parcelas: fecha essa folha e abre a do cadastro
  // com a dívida (são dois Modals, e dois abertos juntos dão problema). Usa a
  // dívida que veio da folha, que já tem as parcelas marcadas; se alguma mudou,
  // relê a lista agora, porque cancelar a edição não relê.
  function aoEditarDivida(divida: Divida, mudou: boolean) {
    setAberta(null);
    setEditando(divida);
    if (mudou) {
      atualizar();
    }
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
            A pagar
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

        <Text accessibilityRole="header" style={[textos.subtitulo, styles.secao]}>
          Gastos fixos
        </Text>
        <Botao
          titulo="Novo gasto fixo"
          tipo="secundario"
          aoTocar={() => setNovoFixoAberto(true)}
        />

        <Animated.View entering={entradaEmCascata(0)} style={styles.cartaoDosFixos}>
          {gastosFixos.length === 0 ? (
            <EstadoVazio icone="repeat" texto="Nenhum gasto fixo cadastrado." />
          ) : (
            gastosFixos.map((gasto, indice) => (
              <LinhaDeGastoFixo
                key={gasto.id}
                gasto={gasto}
                comDivisoria={indice > 0}
                ocupado={marcando}
                aoAbrir={() => setFixoAberto(gasto)}
                aoAlternarPagamento={() => alternarPagamento(gasto)}
              />
            ))
          )}
        </Animated.View>
        {erroDoPagamento !== null && (
          <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.erro]}>
            {erroDoPagamento}
          </Text>
        )}

        <Text accessibilityRole="header" style={[textos.subtitulo, styles.secao]}>
          Dívidas
        </Text>
        <Botao titulo="Nova dívida" tipo="secundario" aoTocar={() => setNovaAberta(true)} />

        {dividas.length === 0 ? (
          <View style={styles.vazio}>
            <EstadoVazio icone="hand-coins" texto="Nenhuma dívida cadastrada." />
          </View>
        ) : (
          // Poucas dívidas, então um map simples basta; FlatList dentro de
          // ScrollView não é recomendado
          // Cada cartão entra em cascata (seção 10 do guia), só na primeira carga
          dividas.map((divida, indice) => (
            <Animated.View key={divida.id} entering={entradaEmCascata(indice + 1)}>
              <CartaoDeDivida divida={divida} aoTocar={() => setAberta(divida)} />
            </Animated.View>
          ))
        )}
      </ScrollView>

      {(novaAberta || editando !== null) && (
        <FolhaDoCadastroDeDivida
          divida={editando ?? undefined}
          aoCancelar={() => {
            setNovaAberta(false);
            setEditando(null);
          }}
          aoSalvar={aoSalvarDivida}
        />
      )}

      {(novoFixoAberto || fixoAberto !== null) && (
        <FolhaDoGastoFixo
          gasto={fixoAberto ?? undefined}
          aoCancelar={() => {
            setNovoFixoAberto(false);
            setFixoAberto(null);
          }}
          aoSalvar={aoSalvarFixo}
          aoApagar={aoSalvarFixo}
        />
      )}

      {aberta !== null && (
        <FolhaDaDivida
          divida={aberta}
          aoFechar={aoFecharDivida}
          aoApagar={aoApagarDivida}
          aoEditar={aoEditarDivida}
        />
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
  secao: {
    marginTop: espaco.pequeno,
  },
  cartaoDosFixos: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
  },
  erro: {
    color: cores.erro,
  },
  vazio: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
  },
});
