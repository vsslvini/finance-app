import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarResumo, ErroApi, type Resumo, type TipoErroApi } from '@/api';
import { iconeDaCategoria } from '@/categorias';
import Botao from '@/componentes/Botao';
import FolhaDeEdicao, { type CampoEditavel } from '@/componentes/FolhaDeEdicao';
import ReguaDeDias from '@/componentes/ReguaDeDias';
import { formatarData, formatarNumero, formatarReais, nomeDoMes } from '@/formatacao';
import { MENSAGENS_DE_ERRO } from '@/mensagens';
import { cantos, cores, espaco, fontes, textos } from '@/tema';

// A tela está sempre em um destes três estados
type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; erro: TipoErroApi }
  | { tipo: 'sucesso'; resumo: Resumo };

// Busca o resumo e devolve o próximo estado da tela (nunca lança erro)
async function carregarEstado(): Promise<Estado> {
  try {
    const resumo = await buscarResumo();
    return { tipo: 'sucesso', resumo };
  } catch (erro) {
    // Erro inesperado (que não seja ErroApi) é tratado como erro do servidor
    const tipo = erro instanceof ErroApi ? erro.tipo : 'servidor';
    return { tipo: 'erro', erro: tipo };
  }
}

// "Saldo: 1.250,50 reais" ou "Posso gastar por dia: menos 10,00 reais"
function rotuloEmReais(nome: string, valor: string): string {
  const menos = valor.startsWith('-') ? 'menos ' : '';
  return `${nome}: ${menos}${formatarNumero(valor)} reais`;
}

// "2026-10" -> "Outubro de 2026" (o mês vem do backend, não do relógio do celular)
function tituloDoMes(mes: string): string {
  const ano = Number(mes.slice(0, 4));
  const numeroDoMes = Number(mes.slice(5, 7));
  return nomeDoMes(ano, numeroDoMes);
}

// "R$ 31,31" -> ["R$ 31", "31"], para desenhar os centavos menores
function separarCentavos(textoEmReais: string): [string, string] {
  const virgula = textoEmReais.lastIndexOf(',');
  return [textoEmReais.slice(0, virgula), textoEmReais.slice(virgula + 1)];
}

export default function InicioScreen() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  // Qual folha de edição está aberta (null = nenhuma)
  const [campoAberto, setCampoAberto] = useState<CampoEditavel | null>(null);

  // useEffect porque buscar dados no servidor é um efeito externo: precisa
  // acontecer uma vez, quando a tela aparece, e não a cada renderização.
  useEffect(() => {
    // Se a tela sair antes da resposta chegar, não mexemos mais no estado
    let ativo = true;
    carregarEstado().then((novoEstado) => {
      if (ativo) {
        setEstado(novoEstado);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Volta para carregando e busca o resumo outra vez.
  // Usado pelo "Tentar de novo" e depois de salvar na folha de edição.
  function recarregar() {
    setEstado({ tipo: 'carregando' });
    carregarEstado().then(setEstado);
  }

  // A folha salvou: fecha a folha e mostra o resumo com o valor novo
  function aoSalvarNaFolha() {
    setCampoAberto(null);
    recarregar();
  }

  if (estado.tipo === 'carregando') {
    return (
      <SafeAreaView style={[styles.tela, styles.centro]}>
        <ActivityIndicator size="large" color={cores.acento} />
        <Text style={[textos.corpo, styles.textoSecundario]}>Carregando o resumo...</Text>
      </SafeAreaView>
    );
  }

  if (estado.tipo === 'erro') {
    // Erro de token não tem botão: tentar de novo não resolve, é preciso
    // corrigir o .env
    const mostrarBotao = estado.erro !== 'token';
    return (
      <SafeAreaView style={[styles.tela, styles.centro]}>
        <Text style={[textos.corpo, styles.textoCentro]}>{MENSAGENS_DE_ERRO[estado.erro]}</Text>
        {mostrarBotao && <Botao titulo="Tentar de novo" tipo="secundario" aoTocar={recarregar} />}
      </SafeAreaView>
    );
  }

  const { resumo } = estado;
  const posso = resumo.posso_gastar_por_dia;

  return (
    <SafeAreaView style={styles.tela}>
      <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
        {/* 1. Título: o nome do mês (as maiúsculas vêm do estilo) */}
        <Text accessibilityRole="header" style={textos.titulo}>
          {tituloDoMes(resumo.mes)}
        </Text>

        {/* 2. Destaque: posso gastar por dia, direto no fundo, sem cartão */}
        {posso !== null && <Destaque valor={posso} />}

        {/* 3. Régua de dias do mês */}
        {resumo.dia_do_mes !== null && resumo.dias_no_mes !== null && (
          <ReguaDeDias diaDoMes={resumo.dia_do_mes} diasNoMes={resumo.dias_no_mes} />
        )}

        {/* 4. Saldo e fatura: tocáveis, abrem a folha de edição */}
        <View style={styles.linha}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rotuloEmReais('Saldo', resumo.saldo_total)}
            accessibilityHint="Toque para mudar o início do mês"
            onPress={() => setCampoAberto('inicioDoMes')}
            style={({ pressed }) => [styles.cartao, styles.cartaoMetade, pressed && styles.apertado]}
          >
            <Text style={textos.rotulo}>Saldo</Text>
            <Text style={textos.valor}>{formatarReais(resumo.saldo_total)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rotuloEmReais('Fatura aberta', resumo.fatura_aberta)}
            accessibilityHint="Toque para mudar o limite da fatura"
            onPress={() => setCampoAberto('limiteDaFatura')}
            style={({ pressed }) => [styles.cartao, styles.cartaoMetade, pressed && styles.apertado]}
          >
            <Text style={textos.rotulo}>Fatura aberta</Text>
            <Text style={textos.valor}>{formatarReais(resumo.fatura_aberta)}</Text>
          </Pressable>
        </View>

        {/* 5. Aviso de fatura acima do limite */}
        {resumo.fatura_acima_do_limite && resumo.limite_fatura !== null && (
          <View style={styles.aviso}>
            <Text style={[textos.corpo, styles.textoAviso]}>
              {`A fatura passou do limite de ${formatarReais(resumo.limite_fatura)}.`}
            </Text>
          </View>
        )}

        {/* 6. Entradas e saídas do mês */}
        <View style={styles.linha}>
          <View
            accessible
            accessibilityLabel={rotuloEmReais('Entrou no mês', resumo.entradas)}
            style={[styles.cartao, styles.cartaoMetade]}
          >
            <Text style={textos.rotulo}>Entrou</Text>
            <Text style={[textos.valor, styles.positivo]}>
              {`+ ${formatarReais(resumo.entradas)}`}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={rotuloEmReais('Saiu no mês', resumo.saidas)}
            style={[styles.cartao, styles.cartaoMetade]}
          >
            <Text style={textos.rotulo}>Saiu</Text>
            <Text style={[textos.valor, styles.negativo]}>
              {`- ${formatarReais(resumo.saidas)}`}
            </Text>
          </View>
        </View>

        {/* 7. Últimos gastos */}
        <Text accessibilityRole="header" style={[textos.subtitulo, styles.subtitulo]}>
          Últimos gastos
        </Text>

        <View style={styles.cartao}>
          {resumo.ultimos_gastos.length === 0 ? (
            <Text style={[textos.corpo, styles.textoSecundario, styles.textoCentro]}>
              Nenhum gasto neste mês ainda.
            </Text>
          ) : (
            // Poucos itens (os últimos gastos), então um map simples basta;
            // FlatList dentro de ScrollView não é recomendado
            resumo.ultimos_gastos.map((gasto, indice) => {
              const icone = iconeDaCategoria(gasto.categoria);
              return (
                <View
                  key={gasto.id}
                  accessible
                  accessibilityLabel={`${gasto.descricao}, gasto de ${formatarNumero(gasto.valor)} reais, ${formatarData(gasto.data)}, ${gasto.nome_banco}, categoria ${gasto.categoria}`}
                  // Divisória só entre itens (o primeiro não tem linha em cima)
                  style={[styles.gasto, indice > 0 && styles.gastoComDivisoria]}
                >
                  {/* Círculo da categoria: só desenho, escondido do leitor de tela */}
                  <View
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden
                    style={[styles.icone, { backgroundColor: icone.fundo }]}
                  >
                    <Text style={[styles.sigla, { color: icone.letra }]}>{icone.sigla}</Text>
                  </View>
                  <View style={styles.gastoMeio}>
                    <Text style={textos.corpo}>{gasto.descricao}</Text>
                    <Text style={textos.detalhe}>
                      {`${formatarData(gasto.data)} · ${gasto.nome_banco} · ${gasto.categoria}`}
                    </Text>
                  </View>
                  <Text style={[textos.valor, styles.negativo]}>{formatarReais(gasto.valor)}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {campoAberto !== null && (
        <FolhaDeEdicao
          campo={campoAberto}
          aoCancelar={() => setCampoAberto(null)}
          aoSalvar={aoSalvarNaFolha}
        />
      )}
    </SafeAreaView>
  );
}

type DestaqueProps = {
  valor: string; // posso_gastar_por_dia, ex.: "31.31" ou "-10.00"
};

// O número grande do dia. Os centavos ficam menores, mas tudo está num só
// Text, então o texto completo continua igual a formatarReais(valor).
function Destaque({ valor }: DestaqueProps) {
  const negativo = valor.startsWith('-');
  const [parteInteira, centavos] = separarCentavos(formatarReais(valor));

  return (
    <View
      accessible
      accessibilityLabel={rotuloEmReais('Posso gastar por dia', valor)}
      style={styles.destaque}
    >
      <Text style={textos.rotulo}>Posso gastar por dia</Text>
      <Text style={[textos.numeroDestaque, negativo && styles.negativo]}>
        {parteInteira}
        <Text style={styles.centavos}>{',' + centavos}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.maior,
    gap: espaco.grande,
  },
  conteudo: {
    padding: espaco.grande,
    gap: espaco.medio,
  },
  textoSecundario: {
    color: cores.textoSecundario,
  },
  textoCentro: {
    textAlign: 'center',
  },
  destaque: {
    gap: espaco.minimo,
    paddingVertical: espaco.pequeno,
  },
  centavos: {
    fontFamily: fontes.seminegrito,
    fontSize: 18,
    letterSpacing: 0,
    color: cores.textoSecundario,
  },
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.medio,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: cantos.cartao,
    padding: espaco.grande,
    gap: espaco.minimo,
  },
  cartaoMetade: {
    // Cada cartão ocupa metade da linha; com fonte grande, vai para baixo
    flexGrow: 1,
    flexBasis: 150,
  },
  apertado: {
    opacity: 0.7,
  },
  positivo: {
    color: cores.positivo,
  },
  negativo: {
    color: cores.negativo,
  },
  aviso: {
    backgroundColor: cores.avisoFundo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    borderRadius: cantos.aviso,
    padding: espaco.medio,
  },
  textoAviso: {
    color: cores.aviso,
  },
  subtitulo: {
    marginTop: espaco.pequeno,
  },
  gasto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.medio,
    paddingVertical: espaco.medio,
  },
  gastoComDivisoria: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  icone: {
    width: 30,
    height: 30,
    borderRadius: cantos.icone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigla: {
    fontFamily: fontes.negrito,
    fontSize: 11,
    lineHeight: 14,
  },
  gastoMeio: {
    flex: 1,
    gap: 2,
  },
});
