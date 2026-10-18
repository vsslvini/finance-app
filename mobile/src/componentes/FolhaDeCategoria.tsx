// Folha "Categoria": troca a categoria de uma transação (aba Transações).
// Segue o mesmo caminho das outras folhas: a ListaDeTransacoes só mostra esta
// folha quando há uma transação aberta; ao aparecer, a folha busca a lista de
// categorias no backend. A busca filtra a lista enquanto a pessoa digita, e
// tocar numa categoria manda o PATCH na hora (não há botão "Salvar").
import { Lucide } from '@react-native-vector-icons/lucide';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarCategorias, trocarCategoria, type Categoria, type Transacao } from '@/api';
import Botao from '@/componentes/Botao';
import CampoDeTexto from '@/componentes/CampoDeTexto';
import { mensagemDoErro } from '@/mensagens';
import { cantos, cores, espaco, fundoEscurecido, textos } from '@/tema';

// "Saúde" -> "saude". O normalize('NFD') separa a letra do acento ("u" + "´"),
// e o replace apaga os acentos soltos (a faixa ̀-ͯ do Unicode).
// Assim a busca não diferencia maiúsculas nem acentos.
function semAcento(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// A folha está sempre em um destes estados enquanto busca as categorias
type Carga =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronta'; categorias: Categoria[] };

type FolhaDeCategoriaProps = {
  transacao: Transacao;
  aoCancelar: () => void;
  aoTrocar: () => void; // chamada depois que o backend aceitou a categoria nova
};

export default function FolhaDeCategoria({
  transacao,
  aoCancelar,
  aoTrocar,
}: FolhaDeCategoriaProps) {
  const [carga, setCarga] = useState<Carga>({ tipo: 'carregando' });
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // useEffect porque buscar as categorias no servidor é um efeito externo:
  // acontece uma vez, quando a folha aparece.
  useEffect(() => {
    // Se a folha fechar antes da resposta chegar, não mexemos mais no estado
    let ativo = true;
    buscarCategorias()
      .then((categorias) => {
        if (ativo) {
          setCarga({ tipo: 'pronta', categorias });
        }
      })
      .catch((erroDaApi: unknown) => {
        if (ativo) {
          setCarga({ tipo: 'erro', mensagem: mensagemDoErro(erroDaApi) });
        }
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Tocar numa categoria (ou em "Usar a categoria do banco", que manda ""):
  // manda o PATCH e, se der certo, avisa a lista para fechar a folha e reler
  async function escolher(descricao: string) {
    // Evita dois PATCH seguidos se a pessoa tocar duas vezes rápido
    if (salvando) {
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await trocarCategoria(transacao.id, descricao);
      aoTrocar();
    } catch (erroDaApi) {
      // Deu errado: a folha continua aberta, com a mensagem (no 400, a do backend)
      setErro(mensagemDoErro(erroDaApi));
      setSalvando(false);
    }
  }

  // A lista filtrada é calculada durante a renderização, a partir da busca;
  // não precisa de outro estado nem de useEffect
  const termo = semAcento(busca.trim());
  const filtradas =
    carga.tipo === 'pronta'
      ? carga.categorias.filter((categoria) => semAcento(categoria.nome).includes(termo))
      : [];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={aoCancelar}>
      {/* Sobe a folha junto com o teclado no iPhone; no Android o sistema já faz isso */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fundo}
      >
        <SafeAreaView edges={['bottom']} style={styles.folha}>
          <Text accessibilityRole="header" style={textos.subtitulo}>
            Categoria
          </Text>
          <Text style={textos.detalhe}>{transacao.descricao}</Text>

          {carga.tipo === 'carregando' && (
            <View style={styles.carregando}>
              <ActivityIndicator color={cores.acento} />
              <Text style={[textos.corpo, styles.textoSecundario]}>Carregando as categorias...</Text>
            </View>
          )}

          {carga.tipo === 'erro' && (
            <Text style={[textos.detalhe, styles.mensagemErro]}>{carga.mensagem}</Text>
          )}

          {carga.tipo === 'pronta' && (
            <>
              <CampoDeTexto
                rotulo="Buscar categoria"
                teclado="default"
                valor={busca}
                aoDigitar={setBusca}
                comErro={false}
              />

              {erro !== null && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[textos.detalhe, styles.mensagemErro]}
                >
                  {erro}
                </Text>
              )}

              {/* FlatList porque a Pluggy tem perto de cem categorias.
                  keyboardShouldPersistTaps="handled": com o teclado aberto, o
                  primeiro toque numa categoria já escolhe (sem ele, o primeiro
                  toque só fecharia o teclado) */}
              <FlatList
                data={filtradas}
                keyExtractor={(categoria) => categoria.descricao}
                keyboardShouldPersistTaps="handled"
                style={styles.lista}
                ListHeaderComponent={
                  <OpcaoDeCategoria
                    nome="Usar a categoria do banco"
                    selecionada={false}
                    aoTocar={() => escolher('')}
                  />
                }
                renderItem={({ item }) => (
                  <OpcaoDeCategoria
                    nome={item.nome}
                    selecionada={item.descricao === transacao.categoria_original}
                    aoTocar={() => escolher(item.descricao)}
                  />
                )}
                ListEmptyComponent={
                  <Text style={[textos.corpo, styles.textoSecundario, styles.vazio]}>
                    Nenhuma categoria encontrada.
                  </Text>
                }
              />
            </>
          )}

          <Botao titulo="Cancelar" tipo="secundario" aoTocar={aoCancelar} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type OpcaoDeCategoriaProps = {
  nome: string;
  selecionada: boolean; // a categoria atual da transação
  aoTocar: () => void;
};

// Uma linha da lista: o nome e, na categoria atual, o ícone de "check".
// Fica neste arquivo porque só esta folha usa.
function OpcaoDeCategoria({ nome, selecionada, aoTocar }: OpcaoDeCategoriaProps) {
  return (
    <Pressable
      accessibilityRole="button"
      // Rótulo explícito para o leitor de tela ler só o nome, sem o ícone
      accessibilityLabel={nome}
      // "selected" faz o leitor de tela dizer que esta é a categoria atual
      accessibilityState={{ selected: selecionada }}
      onPress={aoTocar}
      style={({ pressed }) => [styles.opcao, pressed && styles.apertado]}
    >
      <Text style={[textos.corpo, styles.nomeDaOpcao]}>{nome}</Text>
      {selecionada && (
        // Só desenho: o "selected" acima já avisa o leitor de tela
        <Lucide
          name="check"
          size={20}
          color={cores.acento}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: fundoEscurecido,
  },
  folha: {
    // A folha não passa de 85% da altura da tela; o que sobrar da lista rola
    maxHeight: '85%',
    backgroundColor: cores.superficieElevada,
    borderTopLeftRadius: cantos.folha,
    borderTopRightRadius: cantos.folha,
    padding: espaco.grande,
    gap: espaco.medio,
  },
  carregando: {
    alignItems: 'center',
    gap: espaco.pequeno,
    paddingVertical: espaco.grande,
  },
  textoSecundario: {
    color: cores.textoSecundario,
  },
  mensagemErro: {
    color: cores.erro,
  },
  lista: {
    // flexShrink: com muitas categorias, a lista encolhe para caber na folha
    // (e rola), deixando o "Cancelar" sempre visível embaixo
    flexShrink: 1,
  },
  opcao: {
    // Altura mínima acima dos 44 do guia, para o toque ficar confortável
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.medio,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },
  nomeDaOpcao: {
    flex: 1,
  },
  apertado: {
    opacity: 0.7,
  },
  vazio: {
    textAlign: 'center',
    paddingVertical: espaco.grande,
  },
});
