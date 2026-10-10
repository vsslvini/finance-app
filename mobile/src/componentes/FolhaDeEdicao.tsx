// Folha que sobe de baixo da tela para editar uma configuração:
// o início do mês (toque em "Saldo") ou o limite da fatura (toque em "Fatura aberta").
// A tela Início só mostra esta folha quando há um campo aberto; ao aparecer,
// ela busca as configurações atuais no backend e preenche o campo.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  buscarConfiguracoes,
  ErroApi,
  salvarConfiguracoes,
  type Configuracoes,
} from '@/api';
import Botao from '@/componentes/Botao';
import { formatarNumero, lerReais } from '@/formatacao';
import { MENSAGENS_DE_ERRO } from '@/mensagens';
import { cantos, cores, espaco, fundoEscurecido, textos } from '@/tema';

export type CampoEditavel = 'inicioDoMes' | 'limiteDaFatura';

// Textos fixos de cada folha
const TEXTOS_DA_FOLHA: Record<
  CampoEditavel,
  {
    titulo: string;
    explicacao: string;
    rotuloDoCampo: string;
    teclado: 'number-pad' | 'decimal-pad';
    valorInvalido: string;
  }
> = {
  inicioDoMes: {
    titulo: 'Início do mês',
    explicacao: 'O mês do app começa alguns dias antes do dia 1. Com 2, outubro começa em 29/09.',
    rotuloDoCampo: 'Dias antes do dia 1',
    teclado: 'number-pad',
    valorInvalido: 'Digite um número de 0 a 10.',
  },
  limiteDaFatura: {
    titulo: 'Limite da fatura',
    explicacao:
      'Avisamos na tela Início quando a fatura aberta passar deste valor. Deixe vazio para não ter limite.',
    rotuloDoCampo: 'Limite da fatura em reais',
    teclado: 'decimal-pad',
    valorInvalido: 'Digite um valor, ex.: 1.000,00.',
  },
};

// Texto que aparece no campo quando a folha abre
function textoInicial(campo: CampoEditavel, config: Configuracoes): string {
  if (campo === 'inicioDoMes') {
    return String(config.dias_antes_do_mes);
  }
  return config.limite_fatura === null ? '' : formatarNumero(config.limite_fatura);
}

// Lê o texto digitado e monta o que vai para a API.
// Devolve null quando o texto é inválido (aí a API nem é chamada).
function lerMudancas(campo: CampoEditavel, texto: string): Partial<Configuracoes> | null {
  if (campo === 'inicioDoMes') {
    const limpo = texto.trim();
    // Só dígitos; se está entre 0 e 10 quem confere é o backend
    if (!/^\d+$/.test(limpo)) {
      return null;
    }
    return { dias_antes_do_mes: Number(limpo) };
  }
  try {
    // lerReais devolve null para campo vazio (sem limite)
    return { limite_fatura: lerReais(texto) };
  } catch {
    return null;
  }
}

// Escolhe a frase que aparece embaixo do campo quando a API falha
function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroApi) {
    if (erro.tipo === 'validacao' && erro.mensagem) {
      return erro.mensagem;
    }
    return MENSAGENS_DE_ERRO[erro.tipo];
  }
  return MENSAGENS_DE_ERRO.servidor;
}

// A folha está sempre em um destes estados enquanto busca as configurações
type Carga = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronta' };

type FolhaDeEdicaoProps = {
  campo: CampoEditavel;
  aoCancelar: () => void;
  aoSalvar: () => void; // chamada depois que o backend aceitou a mudança
};

export default function FolhaDeEdicao({ campo, aoCancelar, aoSalvar }: FolhaDeEdicaoProps) {
  const textosDaFolha = TEXTOS_DA_FOLHA[campo];

  const [carga, setCarga] = useState<Carga>({ tipo: 'carregando' });
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [emFoco, setEmFoco] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // useEffect porque buscar as configurações no servidor é um efeito externo:
  // acontece uma vez, quando a folha aparece, para preencher o campo.
  useEffect(() => {
    // Se a folha fechar antes da resposta chegar, não mexemos mais no estado
    let ativo = true;
    buscarConfiguracoes()
      .then((config) => {
        if (ativo) {
          setTexto(textoInicial(campo, config));
          setCarga({ tipo: 'pronta' });
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
  }, [campo]);

  // Botão "Salvar": confere o texto, manda para o backend e avisa a tela
  async function salvar() {
    const mudancas = lerMudancas(campo, texto);
    if (mudancas === null) {
      setErro(textosDaFolha.valorInvalido);
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      await salvarConfiguracoes(mudancas);
      // Deu certo: a tela Início fecha a folha e recarrega o resumo
      aoSalvar();
    } catch (erroDaApi) {
      // Deu errado: a folha continua aberta, com a mensagem embaixo do campo
      setErro(mensagemDoErro(erroDaApi));
      setSalvando(false);
    }
  }

  // Ao digitar, a mensagem de erro antiga some
  function aoDigitar(novoTexto: string) {
    setTexto(novoTexto);
    setErro(null);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={aoCancelar}>
      {/* Sobe a folha junto com o teclado no iPhone; no Android o sistema já faz isso */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fundo}
      >
        <SafeAreaView edges={['bottom']} style={styles.folha}>
          <Text accessibilityRole="header" style={textos.subtitulo}>
            {textosDaFolha.titulo}
          </Text>
          <Text style={[textos.corpo, styles.explicacao]}>{textosDaFolha.explicacao}</Text>

          {carga.tipo === 'carregando' && <ActivityIndicator color={cores.acento} />}

          {carga.tipo === 'erro' && (
            <Text style={[textos.detalhe, styles.mensagemErro]}>{carga.mensagem}</Text>
          )}

          {carga.tipo === 'pronta' && (
            <View style={styles.blocoCampo}>
              <TextInput
                accessibilityLabel={textosDaFolha.rotuloDoCampo}
                keyboardType={textosDaFolha.teclado}
                value={texto}
                onChangeText={aoDigitar}
                onFocus={() => setEmFoco(true)}
                onBlur={() => setEmFoco(false)}
                placeholderTextColor={cores.textoTerciario}
                style={[
                  textos.corpo,
                  styles.campo,
                  // Erro tem prioridade sobre o foco
                  erro !== null ? styles.campoComErro : emFoco && styles.campoEmFoco,
                ]}
              />
              {erro !== null && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[textos.detalhe, styles.mensagemErro]}
                >
                  {erro}
                </Text>
              )}
            </View>
          )}

          <View style={styles.botoes}>
            <View style={styles.botaoMetade}>
              <Botao titulo="Cancelar" tipo="secundario" aoTocar={aoCancelar} />
            </View>
            <View style={styles.botaoMetade}>
              <Botao
                titulo="Salvar"
                tipo="principal"
                aoTocar={salvar}
                desativado={carga.tipo !== 'pronta' || salvando}
              />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: fundoEscurecido,
  },
  folha: {
    backgroundColor: cores.superficieElevada,
    borderTopLeftRadius: cantos.folha,
    borderTopRightRadius: cantos.folha,
    padding: espaco.grande,
    gap: espaco.medio,
  },
  explicacao: {
    color: cores.textoSecundario,
  },
  blocoCampo: {
    gap: espaco.minimo,
  },
  campo: {
    minHeight: 48,
    paddingHorizontal: espaco.medio,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: cantos.campo,
  },
  campoEmFoco: {
    borderWidth: 2,
    borderColor: cores.acento,
  },
  campoComErro: {
    borderWidth: 2,
    borderColor: cores.erro,
  },
  mensagemErro: {
    color: cores.erro,
  },
  botoes: {
    flexDirection: 'row',
    gap: espaco.medio,
    marginTop: espaco.minimo,
  },
  botaoMetade: {
    flex: 1,
  },
});
