// Folha do gasto fixo: serve para cadastrar um novo (sem "gasto") e para editar
// um existente (com "gasto"). Confere os campos no app antes de chamar a API.
// Ao editar, também tem o "Apagar gasto fixo", que pede dois toques.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  apagarGastoFixo,
  criarGastoFixo,
  editarGastoFixo,
  type DadosDoGastoFixo,
  type GastoFixo,
} from '@/api';
import Botao from '@/componentes/Botao';
import CampoDeTexto from '@/componentes/CampoDeTexto';
import Folha from '@/componentes/Folha';
import {
  formatarMes,
  formatarNumero,
  hojeNoCelular,
  lerMes,
  lerReais,
} from '@/formatacao';
import { mensagemDoErro } from '@/mensagens';
import { cores, espaco, textos } from '@/tema';

const TAMANHO_MINIMO_DO_TRECHO = 3;

type CampoDoFixo = 'nome' | 'valor' | 'dia' | 'mes' | 'trecho';
type ErroDaFolha = { mensagem: string; campo: CampoDoFixo | null };

// Tenta ler um valor em reais; null se estiver vazio ou inválido
function valorOuNulo(texto: string): string | null {
  try {
    return lerReais(texto);
  } catch {
    return null;
  }
}

// Confere os campos na ordem da tela e devolve os dados para a API ou o erro do
// primeiro campo com problema (aí a API nem é chamada)
function lerGastoFixo(
  nome: string,
  textoValor: string,
  textoDia: string,
  textoMes: string,
  trecho: string,
): { dados: DadosDoGastoFixo } | { erro: ErroDaFolha } {
  if (nome.trim() === '') {
    return { erro: { mensagem: 'Informe o nome do gasto.', campo: 'nome' } };
  }

  const valor = valorOuNulo(textoValor);
  if (valor === null) {
    return { erro: { mensagem: 'Digite um valor, ex.: 1.200,00.', campo: 'valor' } };
  }
  // Sem nenhum dígito de 1 a 9, o valor é zero
  if (!/[1-9]/.test(valor)) {
    return { erro: { mensagem: 'O valor precisa ser maior que zero.', campo: 'valor' } };
  }

  // O dia é opcional: vazio vira null
  let dia: number | null = null;
  const diaLimpo = textoDia.trim();
  if (diaLimpo !== '') {
    const numero = /^\d+$/.test(diaLimpo) ? Number(diaLimpo) : 0;
    if (numero < 1 || numero > 31) {
      return {
        erro: { mensagem: 'O dia do vencimento precisa ficar entre 1 e 31.', campo: 'dia' },
      };
    }
    dia = numero;
  }

  let mes: string | null;
  try {
    mes = lerMes(textoMes);
  } catch {
    mes = null;
  }
  if (mes === null) {
    return { erro: { mensagem: 'Digite o mês como MM/AAAA.', campo: 'mes' } };
  }

  // O trecho é opcional, mas preenchido precisa ter pelo menos 3 letras
  const trechoLimpo = trecho.trim();
  if (trechoLimpo !== '' && trechoLimpo.length < TAMANHO_MINIMO_DO_TRECHO) {
    return { erro: { mensagem: 'O trecho precisa ter pelo menos 3 letras.', campo: 'trecho' } };
  }

  return {
    dados: {
      nome: nome.trim(),
      valor,
      dia_vencimento: dia,
      mes_inicio: mes,
      trecho_descricao: trechoLimpo,
    },
  };
}

type FolhaDoGastoFixoProps = {
  gasto?: GastoFixo; // sem ele, a folha cadastra um gasto novo
  aoCancelar: () => void;
  aoSalvar: () => void; // chamada depois que o backend aceitou o gasto
  aoApagar: () => void; // chamada depois que o backend apagou o gasto
};

export default function FolhaDoGastoFixo({
  gasto,
  aoCancelar,
  aoSalvar,
  aoApagar,
}: FolhaDoGastoFixoProps) {
  // Ao editar, os campos partem do gasto; na folha nova, partem vazios, e o mês
  // começa com o mês atual do celular, no formato do campo: "10/2026"
  const [nome, setNome] = useState(gasto?.nome ?? '');
  const [textoValor, setTextoValor] = useState(gasto ? formatarNumero(gasto.valor) : '');
  const [textoDia, setTextoDia] = useState(
    gasto && gasto.dia_vencimento !== null ? String(gasto.dia_vencimento) : '',
  );
  const [textoMes, setTextoMes] = useState(() =>
    formatarMes(gasto ? gasto.mes_inicio : hojeNoCelular().slice(0, 7)),
  );
  const [trecho, setTrecho] = useState(gasto?.trecho_descricao ?? '');
  const [erro, setErro] = useState<ErroDaFolha | null>(null);
  // true durante qualquer pedido (salvar ou apagar)
  const [salvando, setSalvando] = useState(false);
  // true depois do primeiro toque em "Apagar gasto fixo"
  const [confirmando, setConfirmando] = useState(false);

  async function salvar() {
    setConfirmando(false);
    const resultado = lerGastoFixo(nome, textoValor, textoDia, textoMes, trecho);
    if ('erro' in resultado) {
      setErro(resultado.erro);
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      if (gasto) {
        await editarGastoFixo(gasto.id, resultado.dados);
      } else {
        await criarGastoFixo(resultado.dados);
      }
      // Deu certo: a aba fecha a folha e relê a lista
      aoSalvar();
    } catch (erroDaApi) {
      // Deu errado: a folha continua aberta, com a mensagem embaixo dos campos
      setErro({ mensagem: mensagemDoErro(erroDaApi), campo: null });
      setSalvando(false);
    }
  }

  // Primeiro toque: pede a confirmação. Segundo toque: apaga de verdade.
  async function apagar() {
    if (!gasto) {
      return;
    }
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await apagarGastoFixo(gasto.id);
      aoApagar();
    } catch (erroDaApi) {
      setErro({ mensagem: mensagemDoErro(erroDaApi), campo: null });
      setConfirmando(false);
      setSalvando(false);
    }
  }

  // Ao digitar em qualquer campo, a mensagem de erro antiga e a confirmação
  // de apagar somem
  function digitar(trocar: (texto: string) => void) {
    return (novoTexto: string) => {
      trocar(novoTexto);
      setErro(null);
      setConfirmando(false);
    };
  }

  // Tocar num campo também cancela a confirmação de apagar
  function cancelarConfirmacao() {
    setConfirmando(false);
  }

  return (
    // A folha não passa de 85% da altura da tela; o que sobrar dos campos rola
    <Folha aoFechar={aoCancelar} alturaMaxima="85%">
      <Text accessibilityRole="header" style={textos.subtitulo}>
        {gasto ? gasto.nome : 'Novo gasto fixo'}
      </Text>
      <Text style={[textos.corpo, styles.explicacao]}>
        Conta como saída todo mês até ser pago. Vale até você apagar.
      </Text>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.rolagem}
        contentContainerStyle={styles.campos}
      >
        {/* Os nomes visíveis ficam escondidos do leitor de tela, porque o
            próprio campo já é lido com o mesmo nome (accessibilityLabel) */}
        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Nome
          </Text>
          <CampoDeTexto
            rotulo="Nome"
            teclado="default"
            valor={nome}
            aoDigitar={digitar(setNome)}
            aoFocar={cancelarConfirmacao}
            comErro={erro?.campo === 'nome'}
          />
        </View>

        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Valor por mês
          </Text>
          <CampoDeTexto
            rotulo="Valor por mês"
            teclado="decimal-pad"
            valor={textoValor}
            aoDigitar={digitar(setTextoValor)}
            aoFocar={cancelarConfirmacao}
            comErro={erro?.campo === 'valor'}
          />
        </View>

        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Dia do vencimento (opcional)
          </Text>
          <CampoDeTexto
            rotulo="Dia do vencimento (opcional)"
            teclado="number-pad"
            valor={textoDia}
            aoDigitar={digitar(setTextoDia)}
            aoFocar={cancelarConfirmacao}
            comErro={erro?.campo === 'dia'}
          />
        </View>

        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Começa em (MM/AAAA)
          </Text>
          {/* Teclado com números e barra; no Android vira o teclado comum */}
          <CampoDeTexto
            rotulo="Começa em (MM/AAAA)"
            teclado="numbers-and-punctuation"
            valor={textoMes}
            aoDigitar={digitar(setTextoMes)}
            aoFocar={cancelarConfirmacao}
            comErro={erro?.campo === 'mes'}
          />
        </View>

        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Trecho para achar o pagamento (opcional)
          </Text>
          <CampoDeTexto
            rotulo="Trecho para achar o pagamento (opcional)"
            teclado="default"
            valor={trecho}
            aoDigitar={digitar(setTrecho)}
            aoFocar={cancelarConfirmacao}
            comErro={erro?.campo === 'trecho'}
          />
          <Text style={textos.detalhe}>
            Parte do nome que aparece no extrato quando você paga, ex.: DIRECIONAL. Com ele, o app
            marca como pago sozinho.
          </Text>
        </View>

        {/* Uma mensagem só, embaixo dos campos */}
        {erro !== null && (
          <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.mensagemErro]}>
            {erro.mensagem}
          </Text>
        )}
        {confirmando && (
          <Text style={[textos.detalhe, styles.mensagemErro]}>
            O gasto fixo e as marcações de pago serão apagados.
          </Text>
        )}
      </ScrollView>

      <View style={styles.botoes}>
        <View style={styles.botaoMetade}>
          <Botao titulo="Cancelar" tipo="secundario" aoTocar={aoCancelar} />
        </View>
        <View style={styles.botaoMetade}>
          <Botao titulo="Salvar" tipo="principal" aoTocar={salvar} desativado={salvando} />
        </View>
      </View>
      {gasto && (
        <Botao
          titulo={confirmando ? 'Toque de novo para apagar' : 'Apagar gasto fixo'}
          tipo="secundario"
          aoTocar={apagar}
          desativado={salvando}
        />
      )}
    </Folha>
  );
}

const styles = StyleSheet.create({
  explicacao: {
    color: cores.textoSecundario,
  },
  rolagem: {
    // Com o teclado aberto, a lista de campos encolhe e rola
    flexShrink: 1,
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
