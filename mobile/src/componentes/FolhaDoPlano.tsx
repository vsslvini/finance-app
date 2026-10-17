// Folha "Plano de guardar": quanto guardar por mês e até quando.
// Segue o mesmo caminho da FolhaDeEdicao: a tela Início só mostra esta folha
// quando ela está aberta; ao aparecer, a folha busca o plano atual no backend
// e preenche os dois campos. Ao salvar, confere o texto antes de chamar a API.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarPlano, salvarPlano, type PlanoDeGuardar } from '@/api';
import Botao from '@/componentes/Botao';
import CampoDeTexto from '@/componentes/CampoDeTexto';
import { formatarMes, formatarNumero, lerMes, lerReais } from '@/formatacao';
import { mensagemDoErro } from '@/mensagens';
import { cantos, cores, espaco, fundoEscurecido, textos } from '@/tema';

const VALOR_INVALIDO = 'Digite um valor, ex.: 500,00.';
const MES_INVALIDO = 'Digite o mês como MM/AAAA.';

// Qual campo ficou com a borda vermelha (null = erro da API, sem campo certo)
type CampoDoPlano = 'valor' | 'mes';
type ErroDaFolha = { mensagem: string; campo: CampoDoPlano | null };

// Lê os dois campos e devolve o plano para a API ou o erro do primeiro campo
// inválido (aí a API nem é chamada). Campo vazio vira null; se só um estiver
// vazio, deixamos o backend recusar e mostramos a mensagem dele.
function lerPlano(
  textoValor: string,
  textoMes: string,
): { plano: PlanoDeGuardar } | { erro: ErroDaFolha } {
  let valorMensal: string | null;
  try {
    valorMensal = lerReais(textoValor);
  } catch {
    return { erro: { mensagem: VALOR_INVALIDO, campo: 'valor' } };
  }

  let mesAlvo: string | null;
  try {
    mesAlvo = lerMes(textoMes);
  } catch {
    return { erro: { mensagem: MES_INVALIDO, campo: 'mes' } };
  }

  return { plano: { valor_mensal: valorMensal, mes_alvo: mesAlvo } };
}

// A folha está sempre em um destes estados enquanto busca o plano
type Carga = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronta' };

type FolhaDoPlanoProps = {
  aoCancelar: () => void;
  aoSalvar: () => void; // chamada depois que o backend aceitou o plano
};

export default function FolhaDoPlano({ aoCancelar, aoSalvar }: FolhaDoPlanoProps) {
  const [carga, setCarga] = useState<Carga>({ tipo: 'carregando' });
  const [textoValor, setTextoValor] = useState('');
  const [textoMes, setTextoMes] = useState('');
  const [erro, setErro] = useState<ErroDaFolha | null>(null);
  const [salvando, setSalvando] = useState(false);

  // useEffect porque buscar o plano no servidor é um efeito externo:
  // acontece uma vez, quando a folha aparece, para preencher os campos.
  useEffect(() => {
    // Se a folha fechar antes da resposta chegar, não mexemos mais no estado
    let ativo = true;
    buscarPlano()
      .then((plano) => {
        if (ativo) {
          // Sem plano, os campos começam vazios
          setTextoValor(plano.valor_mensal === null ? '' : formatarNumero(plano.valor_mensal));
          setTextoMes(plano.mes_alvo === null ? '' : formatarMes(plano.mes_alvo));
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
  }, []);

  // Botão "Salvar": confere os campos, manda para o backend e avisa a tela
  async function salvar() {
    const resultado = lerPlano(textoValor, textoMes);
    if ('erro' in resultado) {
      setErro(resultado.erro);
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      await salvarPlano(resultado.plano);
      // Deu certo: a tela Início fecha a folha e recarrega o resumo
      aoSalvar();
    } catch (erroDaApi) {
      // Deu errado: a folha continua aberta, com a mensagem embaixo dos campos
      setErro({ mensagem: mensagemDoErro(erroDaApi), campo: null });
      setSalvando(false);
    }
  }

  // Ao digitar em qualquer campo, a mensagem de erro antiga some
  function aoDigitarValor(novoTexto: string) {
    setTextoValor(novoTexto);
    setErro(null);
  }

  function aoDigitarMes(novoTexto: string) {
    setTextoMes(novoTexto);
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
            Plano de guardar
          </Text>
          <Text style={[textos.corpo, styles.explicacao]}>
            Quanto guardar por mês e até quando. Deixe os dois vazios para não ter plano.
          </Text>

          {carga.tipo === 'carregando' && <ActivityIndicator color={cores.acento} />}

          {carga.tipo === 'erro' && (
            <Text style={[textos.detalhe, styles.mensagemErro]}>{carga.mensagem}</Text>
          )}

          {carga.tipo === 'pronta' && (
            <View style={styles.campos}>
              {/* Os nomes visíveis ficam escondidos do leitor de tela, porque o
                  próprio campo já é lido com o mesmo nome (accessibilityLabel) */}
              <View style={styles.blocoCampo}>
                <Text
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={textos.rotulo}
                >
                  Quanto por mês
                </Text>
                <CampoDeTexto
                  rotulo="Quanto por mês"
                  teclado="decimal-pad"
                  valor={textoValor}
                  aoDigitar={aoDigitarValor}
                  comErro={erro?.campo === 'valor'}
                />
              </View>

              <View style={styles.blocoCampo}>
                <Text
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={textos.rotulo}
                >
                  Até quando (MM/AAAA)
                </Text>
                {/* Teclado com números e barra; no Android vira o teclado comum */}
                <CampoDeTexto
                  rotulo="Até quando (MM/AAAA)"
                  teclado="numbers-and-punctuation"
                  valor={textoMes}
                  aoDigitar={aoDigitarMes}
                  comErro={erro?.campo === 'mes'}
                />
              </View>

              {/* Uma mensagem só, embaixo dos dois campos */}
              {erro !== null && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[textos.detalhe, styles.mensagemErro]}
                >
                  {erro.mensagem}
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
  campos: {
    gap: espaco.medio,
  },
  blocoCampo: {
    gap: espaco.minimo,
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
