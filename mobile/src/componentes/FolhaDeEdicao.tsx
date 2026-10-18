// Folha que sobe de baixo da tela para editar uma configuração:
// o início do mês (toque em "Entrou") ou o limite da fatura (toque em "Fatura aberta").
// A tela Início só mostra esta folha quando há um campo aberto; ao aparecer,
// ela busca as configurações atuais no backend e preenche o campo.
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { buscarConfiguracoes, salvarConfiguracoes, type Configuracoes } from '@/api';
import Botao from '@/componentes/Botao';
import CampoDeTexto from '@/componentes/CampoDeTexto';
import Folha from '@/componentes/Folha';
import { formatarNumero, lerReais } from '@/formatacao';
import { mensagemDoErro } from '@/mensagens';
import { cores, espaco, textos } from '@/tema';

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
    <Folha aoFechar={aoCancelar}>
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
          <CampoDeTexto
            rotulo={textosDaFolha.rotuloDoCampo}
            teclado={textosDaFolha.teclado}
            valor={texto}
            aoDigitar={aoDigitar}
            comErro={erro !== null}
          />
          {erro !== null && (
            <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.mensagemErro]}>
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
    </Folha>
  );
}

const styles = StyleSheet.create({
  explicacao: {
    color: cores.textoSecundario,
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
