import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarResumo, ErroApi, type Resumo, type TipoErroApi } from '@/api';
import { formatarData, formatarNumero, formatarReais, nomeDoMes } from '@/formatacao';

// A tela está sempre em um destes três estados
type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; erro: TipoErroApi }
  | { tipo: 'sucesso'; resumo: Resumo };

const MENSAGENS_DE_ERRO: Record<TipoErroApi, string> = {
  conexao:
    'Não foi possível conectar ao servidor. Confira se o backend está rodando e se o celular está na mesma rede.',
  token: 'Acesso negado pelo servidor. Confira o token no arquivo .env do app.',
  servidor: 'O servidor teve um erro. Tente de novo em instantes.',
};

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

// "Saldo total: 1.250,50 reais" ou "Saldo total: menos 10,00 reais"
function rotuloEmReais(nome: string, valor: string): string {
  const menos = valor.startsWith('-') ? 'menos ' : '';
  return `${nome}: ${menos}${formatarNumero(valor)} reais`;
}

export default function InicioScreen() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

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

  // Botão "Tentar de novo": volta para carregando e busca outra vez
  function tentarDeNovo() {
    setEstado({ tipo: 'carregando' });
    carregarEstado().then(setEstado);
  }

  if (estado.tipo === 'carregando') {
    return (
      <SafeAreaView style={[styles.tela, styles.centro]}>
        <ActivityIndicator size="large" />
        <Text style={styles.textoSecundario}>Carregando o resumo...</Text>
      </SafeAreaView>
    );
  }

  if (estado.tipo === 'erro') {
    // Erro de token não tem botão: tentar de novo não resolve, é preciso
    // corrigir o .env
    const mostrarBotao = estado.erro !== 'token';
    return (
      <SafeAreaView style={[styles.tela, styles.centro]}>
        <Text style={styles.textoErro}>{MENSAGENS_DE_ERRO[estado.erro]}</Text>
        {mostrarBotao && (
          <Pressable
            accessibilityRole="button"
            onPress={tentarDeNovo}
            style={({ pressed }) => [styles.botao, pressed && styles.botaoPressionado]}
          >
            <Text style={styles.textoBotao}>Tentar de novo</Text>
          </Pressable>
        )}
      </SafeAreaView>
    );
  }

  const { resumo } = estado;
  const hoje = new Date();
  const titulo = nomeDoMes(hoje.getFullYear(), hoje.getMonth() + 1);
  const posso = resumo.posso_gastar_por_dia;
  const possoNegativo = posso !== null && posso.startsWith('-');

  return (
    <SafeAreaView style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text accessibilityRole="header" style={styles.titulo}>
          {titulo}
        </Text>

        {posso !== null && (
          <View
            accessible
            accessibilityLabel={rotuloEmReais('Posso gastar por dia', posso)}
            style={styles.cartao}
          >
            <Text style={styles.rotulo}>Posso gastar por dia</Text>
            <Text style={[styles.valorDestaque, possoNegativo && styles.negativo]}>
              {formatarReais(posso)}
            </Text>
            {possoNegativo && (
              <Text style={styles.textoSecundario}>A fatura aberta é maior que o saldo.</Text>
            )}
          </View>
        )}

        <View style={styles.linha}>
          <View
            accessible
            accessibilityLabel={rotuloEmReais('Saldo total', resumo.saldo_total)}
            style={[styles.cartao, styles.cartaoMetade]}
          >
            <Text style={styles.rotulo}>Saldo total</Text>
            <Text style={styles.valor}>{formatarReais(resumo.saldo_total)}</Text>
          </View>
          <View
            accessible
            accessibilityLabel={rotuloEmReais('Fatura aberta', resumo.fatura_aberta)}
            style={[styles.cartao, styles.cartaoMetade]}
          >
            <Text style={styles.rotulo}>Fatura aberta</Text>
            <Text style={styles.valor}>{formatarReais(resumo.fatura_aberta)}</Text>
          </View>
        </View>

        <View style={styles.linha}>
          <View
            accessible
            accessibilityLabel={rotuloEmReais('Entradas do mês', resumo.entradas)}
            style={[styles.cartao, styles.cartaoMetade]}
          >
            <Text style={styles.rotulo}>Entradas</Text>
            <Text style={[styles.valor, styles.positivo]}>
              {`+ ${formatarReais(resumo.entradas)}`}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={rotuloEmReais('Saídas do mês', resumo.saidas)}
            style={[styles.cartao, styles.cartaoMetade]}
          >
            <Text style={styles.rotulo}>Saídas</Text>
            <Text style={[styles.valor, styles.negativo]}>
              {`- ${formatarReais(resumo.saidas)}`}
            </Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.subtitulo}>
          Últimos gastos
        </Text>

        {resumo.ultimos_gastos.length === 0 ? (
          <Text style={styles.textoSecundario}>Nenhum gasto neste mês ainda.</Text>
        ) : (
          // Poucos itens (os últimos gastos), então um map simples basta;
          // FlatList dentro de ScrollView não é recomendado
          resumo.ultimos_gastos.map((gasto) => (
            <View
              key={gasto.id}
              accessible
              accessibilityLabel={`${gasto.descricao}, gasto de ${formatarNumero(gasto.valor)} reais, ${formatarData(gasto.data)}, ${gasto.nome_banco}, categoria ${gasto.categoria}`}
              style={styles.gasto}
            >
              <View style={styles.gastoLinha}>
                <Text style={styles.gastoDescricao}>{gasto.descricao}</Text>
                <Text style={[styles.gastoValor, styles.negativo]}>
                  {formatarReais(gasto.valor)}
                </Text>
              </View>
              <Text style={styles.rotulo}>
                {`${formatarData(gasto.data)} · ${gasto.nome_banco} · ${gasto.categoria}`}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const COR_TEXTO = '#1A1A1A';
const COR_SECUNDARIA = '#555555';

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  conteudo: {
    padding: 16,
    gap: 12,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COR_TEXTO,
  },
  subtitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COR_TEXTO,
    marginTop: 8,
  },
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cartao: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 16,
    gap: 4,
  },
  cartaoMetade: {
    // Cada cartão ocupa metade da linha; em tela estreita, vai para baixo
    flexGrow: 1,
    flexBasis: 150,
  },
  rotulo: {
    fontSize: 14,
    color: COR_SECUNDARIA,
  },
  valor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COR_TEXTO,
  },
  valorDestaque: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COR_TEXTO,
  },
  positivo: {
    color: '#1B5E20',
  },
  negativo: {
    color: '#B00020',
  },
  textoSecundario: {
    fontSize: 16,
    color: COR_SECUNDARIA,
    textAlign: 'center',
  },
  textoErro: {
    fontSize: 16,
    color: COR_TEXTO,
    textAlign: 'center',
  },
  botao: {
    minHeight: 48,
    minWidth: 160,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COR_TEXTO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPressionado: {
    opacity: 0.7,
  },
  textoBotao: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  gasto: {
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    paddingVertical: 12,
    gap: 4,
  },
  gastoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gastoDescricao: {
    flex: 1,
    fontSize: 16,
    color: COR_TEXTO,
  },
  gastoValor: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
