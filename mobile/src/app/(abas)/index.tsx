import { Lucide } from '@react-native-vector-icons/lucide';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buscarResumo, ErroApi, sincronizar, type Resumo, type TipoErroApi } from '@/api';
import { iconeDaCategoria } from '@/categorias';
import Botao from '@/componentes/Botao';
import BotaoDoOlho from '@/componentes/BotaoDoOlho';
import CartaoDoPrevisto from '@/componentes/CartaoDoPrevisto';
import DestaqueDoDia from '@/componentes/DestaqueDoDia';
import EsqueletoDoInicio from '@/componentes/EsqueletoDoInicio';
import EstadoVazio from '@/componentes/EstadoVazio';
import FolhaDeEdicao, { type CampoEditavel } from '@/componentes/FolhaDeEdicao';
import FolhaDoPlano from '@/componentes/FolhaDoPlano';
import ReguaDeDias from '@/componentes/ReguaDeDias';
import RotuloDoCartao from '@/componentes/RotuloDoCartao';
import SecaoGuardado from '@/componentes/SecaoGuardado';
import Tocavel from '@/componentes/Tocavel';
import { formatarData, hojeNoCelular, textoDaAtualizacao, tituloDoMes } from '@/formatacao';
import { MENSAGENS_DE_ERRO } from '@/mensagens';
import { entradaEmCascata } from '@/movimento';
import { cantos, cores, espaco, textos } from '@/tema';
import { criarDinheiro, ProvedorDeValores } from '@/valoresVisiveis';

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

export default function InicioScreen() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  // Qual folha de edição está aberta (null = nenhuma)
  const [campoAberto, setCampoAberto] = useState<CampoEditavel | null>(null);
  // A folha do plano de guardar fica num estado separado, porque ela tem dois
  // campos e fala com outra rota (/api/plano/), diferente da FolhaDeEdicao
  const [planoAberto, setPlanoAberto] = useState(false);
  // true enquanto o "puxar para baixo" está sincronizando (mostra o indicador)
  const [atualizando, setAtualizando] = useState(false);
  // true quando a última tentativa de puxar para baixo falhou (mostra o aviso)
  const [falhouAoAtualizar, setFalhouAoAtualizar] = useState(false);
  // Olho do cabeçalho (Módulo 19b): false esconde os valores em dinheiro.
  // Fica só na memória: ao abrir o app de novo, os valores voltam a aparecer
  const [valoresVisiveis, setValoresVisiveis] = useState(true);

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

  // Ao voltar para a aba Início (por exemplo, depois de marcar um gasto fixo
  // como pago em "A pagar"), relê o resumo para o previsto refletir a mudança.
  // O useFocusEffect roda também na primeira vez que a aba aparece, quando o
  // useEffect acima já está buscando; por isso a primeira chamada é ignorada
  // (senão o resumo seria pedido duas vezes). Sem passar por 'carregando': o
  // resumo antigo fica na tela até o novo chegar, e se falhar nada muda.
  // O useCallback é exigido pela documentação do useFocusEffect, para o efeito
  // não rodar de novo a cada renderização.
  const primeiraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeiraVez.current) {
        primeiraVez.current = false;
        return undefined;
      }
      let ativo = true;
      buscarResumo()
        .then((resumo) => {
          if (ativo) {
            setEstado({ tipo: 'sucesso', resumo });
          }
        })
        .catch(() => {
          // Mantém o resumo que já está na tela
        });
      return () => {
        ativo = false;
      };
    }, []),
  );

  // Volta para carregando e busca o resumo outra vez.
  // Usado pelo "Tentar de novo" e depois de salvar na folha de edição.
  function recarregar() {
    setEstado({ tipo: 'carregando' });
    carregarEstado().then(setEstado);
  }

  // Puxar para baixo: pede ao backend para buscar os dados novos na Pluggy e
  // depois lê o resumo outra vez. Diferente do recarregar(), não passa pelo
  // estado 'carregando': o resumo antigo fica na tela até o novo chegar, e se
  // algo falhar ele continua lá, só com o aviso embaixo do título.
  async function atualizar() {
    setAtualizando(true);
    try {
      // Se a sincronização falhar, o await lança o erro e pulamos direto para
      // o catch, sem buscar o resumo (ele seria igual ao que já está na tela)
      await sincronizar();
      const resumo = await buscarResumo();
      setEstado({ tipo: 'sucesso', resumo });
      // Deu certo: some o aviso de uma falha anterior, se houver
      setFalhouAoAtualizar(false);
    } catch {
      // Qualquer erro (rede, token, Pluggy fora) mostra o mesmo aviso curto:
      // os valores de antes continuam valendo
      setFalhouAoAtualizar(true);
    } finally {
      // Deu certo ou não, o indicador de "atualizando" some
      setAtualizando(false);
    }
  }

  // Relê o resumo sem passar por 'carregando' (sem sincronizar com a Pluggy):
  // o resumo antigo fica na tela até o novo chegar, os blocos continuam
  // montados e a cascata de entrada não se repete. Se falhar, o resumo antigo
  // continua lá, só com o aviso embaixo do título.
  async function reler() {
    try {
      const resumo = await buscarResumo();
      setEstado({ tipo: 'sucesso', resumo });
      setFalhouAoAtualizar(false);
    } catch {
      setFalhouAoAtualizar(true);
    }
  }

  // A folha salvou: fecha a folha e mostra o resumo com o valor novo
  function aoSalvarNaFolha() {
    setCampoAberto(null);
    reler();
  }

  // O plano salvou: fecha a folha e relê, porque o plano muda a seção
  // Guardado e o "posso gastar" (o backend desconta o que falta guardar)
  function aoSalvarPlano() {
    setPlanoAberto(false);
    reler();
  }

  if (estado.tipo === 'carregando') {
    return (
      <SafeAreaView style={styles.tela}>
        <EsqueletoDoInicio />
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
  // O que o backend já tirou do "posso gastar" para o plano de guardar
  // (null quando não há desconto, e aí a linha "já separando" não aparece)
  const falta = resumo.guardado.falta_guardar_no_mes;
  const separando = falta !== '0.00' ? falta : null;
  // Dívidas (Módulo 12): null quando não há nada, e aí as linhas e a faixa não aparecem
  const dividasDoMes =
    resumo.dividas_do_mes && resumo.dividas_do_mes !== '0.00' ? resumo.dividas_do_mes : null;
  const dividasAtrasadas =
    resumo.dividas_atrasadas && resumo.dividas_atrasadas !== '0.00'
      ? resumo.dividas_atrasadas
      : null;
  // Gastos fixos a pagar no mês (Módulo 14): null quando não há nada
  const fixosDoMes =
    resumo.fixos_do_mes && resumo.fixos_do_mes !== '0.00' ? resumo.fixos_do_mes : null;
  // As funções de formatar dinheiro desta tela, que obedecem ao olho (Módulo
  // 19b): reais("1250.50") dá "R$ 1.250,50" ou "R$ ••••". A tela guarda o
  // estado e fica por fora do próprio provedor, por isso usa criarDinheiro
  // direto; os componentes de dentro do ProvedorDeValores (destaque, previsto,
  // Guardado) leem o mesmo estado pelo useDinheiro()
  const { reais, rotulo, emReais } = criarDinheiro(valoresVisiveis);

  return (
    <ProvedorDeValores visiveis={valoresVisiveis}>
      <SafeAreaView style={styles.tela}>
        <ScrollView
          testID="rolagem-inicio"
          style={styles.tela}
          contentContainerStyle={styles.conteudo}
          // Puxar para baixo chama atualizar(). tintColor pinta o indicador no
          // iOS; colors e progressBackgroundColor pintam o círculo no Android
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
          {/* 1. Título: o nome do mês (as maiúsculas vêm do estilo), a hora da
              última sincronização e, se o puxar para baixo falhou, o aviso.
              À direita, o olho que esconde e mostra os valores */}
          <View style={styles.cabecalho}>
            <View style={styles.cabecalhoTextos}>
              <Text accessibilityRole="header" style={textos.titulo}>
                {tituloDoMes(resumo.mes)}
              </Text>
              <Text style={textos.detalhe}>
                {textoDaAtualizacao(resumo.ultima_atualizacao, hojeNoCelular())}
              </Text>
              {falhouAoAtualizar && (
                // accessibilityLiveRegion faz o leitor de tela do Android ler o
                // aviso assim que ele aparece, sem a pessoa precisar procurar
                <Text
                  accessibilityLiveRegion="polite"
                  style={[textos.detalhe, styles.textoAvisoCurto]}
                >
                  Não foi possível atualizar agora.
                </Text>
              )}
            </View>
            <BotaoDoOlho
              visiveis={valoresVisiveis}
              aoTocar={() => setValoresVisiveis((antes) => !antes)}
            />
          </View>

          {/* 2. Destaque: posso gastar por dia, num cartão com gradiente roxo */}
          {/* Os cinco blocos principais entram em cascata (seção 10 do guia). O
              Animated.View fica por fora dos Pressables. Os índices são fixos,
              mesmo quando um bloco não aparece */}
          {posso !== null && (
            <Animated.View entering={entradaEmCascata(0)}>
              <DestaqueDoDia valor={posso} separando={separando} />
            </Animated.View>
          )}

          {/* 3. Régua de dias do mês */}
          {resumo.dia_do_mes !== null && resumo.dias_no_mes !== null && (
            <Animated.View entering={entradaEmCascata(1)}>
              <ReguaDeDias diaDoMes={resumo.dia_do_mes} diasNoMes={resumo.dias_no_mes} />
            </Animated.View>
          )}

          {/* 3b. Gasto previsto (só leitura); sem o bloco no resumo, não aparece */}
          {resumo.previsto !== undefined && (
            <Animated.View entering={entradaEmCascata(2)}>
              <CartaoDoPrevisto previsto={resumo.previsto} />
            </Animated.View>
          )}

          {/* 4. Saldo (só leitura) e fatura (tocável, abre a folha do limite) */}
          <Animated.View entering={entradaEmCascata(3)} style={styles.linha}>
            <View
              accessible
              accessibilityLabel={rotulo('Saldo', resumo.saldo_total)}
              style={[styles.cartao, styles.cartaoMetade]}
            >
              <RotuloDoCartao texto="Saldo" icone="wallet" />
              <Text style={textos.valor}>{reais(resumo.saldo_total)}</Text>
            </View>
            <Tocavel
              accessibilityRole="button"
              accessibilityLabel={rotulo('Fatura aberta', resumo.fatura_aberta)}
              accessibilityHint="Toque para mudar o limite da fatura"
              onPress={() => setCampoAberto('limiteDaFatura')}
              style={[styles.cartao, styles.cartaoMetade]}
            >
              <RotuloDoCartao texto="Fatura aberta" icone="credit-card" />
              <Text style={textos.valor}>{reais(resumo.fatura_aberta)}</Text>
            </Tocavel>
          </Animated.View>

          {/* 5. Aviso de fatura acima do limite */}
          {resumo.fatura_acima_do_limite && resumo.limite_fatura !== null && (
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
                {`A fatura passou do limite de ${reais(resumo.limite_fatura)}.`}
              </Text>
            </View>
          )}

          {/* 5b. Aviso de parcelas de dívidas atrasadas */}
          {dividasAtrasadas !== null && (
            <View style={styles.aviso}>
              <Lucide
                name="triangle-alert"
                size={18}
                color={cores.aviso}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text style={[textos.corpo, styles.textoAviso]}>
                {`Há ${reais(dividasAtrasadas)} em parcelas de dívidas atrasadas.`}
              </Text>
            </View>
          )}

          {/* 6. Entradas e saídas do mês: "Entrou" é tocável e abre a folha do início do mês */}
          <Animated.View entering={entradaEmCascata(4)} style={styles.linha}>
            <Tocavel
              accessibilityRole="button"
              accessibilityLabel={rotulo('Entrou no mês', resumo.entradas)}
              accessibilityHint="Toque para mudar o início do mês"
              onPress={() => setCampoAberto('inicioDoMes')}
              style={[styles.cartao, styles.cartaoMetade]}
            >
              <RotuloDoCartao texto="Entrou" icone="arrow-down-left" corDoIcone={cores.positivo} />
              <Text style={[textos.valor, styles.positivo]}>{`+ ${reais(resumo.entradas)}`}</Text>
            </Tocavel>
            <View
              accessible
              accessibilityLabel={
                rotulo('Saiu no mês', resumo.saidas) +
                (dividasDoMes === null ? '' : `, inclui ${emReais(dividasDoMes)} de dívidas`) +
                (fixosDoMes === null ? '' : `, inclui ${emReais(fixosDoMes)} de gastos fixos`)
              }
              style={[styles.cartao, styles.cartaoMetade]}
            >
              <RotuloDoCartao texto="Saiu" icone="arrow-up-right" corDoIcone={cores.negativo} />
              <Text style={[textos.valor, styles.negativo]}>{`- ${reais(resumo.saidas)}`}</Text>
              {dividasDoMes !== null && (
                <Text style={textos.detalhe}>{`inclui ${reais(dividasDoMes)} de dívidas`}</Text>
              )}
              {fixosDoMes !== null && (
                <Text style={textos.detalhe}>{`inclui ${reais(fixosDoMes)} de gastos fixos`}</Text>
              )}
            </View>
          </Animated.View>

          {/* 6b. Abre a tela Relatório por cima das abas (ela mora na pilha da
              raiz, fora do grupo (abas)); o push empilha, e o "Voltar" de lá
              desempilha e volta para cá */}
          <Botao
            titulo="Ver relatório do mês"
            tipo="secundario"
            aoTocar={() => router.push('/relatorio')}
          />

          {/* 7. Guardado: investimentos e plano (tocável, abre a folha do plano) */}
          <Animated.View entering={entradaEmCascata(5)}>
            <SecaoGuardado guardado={resumo.guardado} aoTocar={() => setPlanoAberto(true)} />
          </Animated.View>

          {/* 8. Últimos gastos */}
          <Text accessibilityRole="header" style={[textos.subtitulo, styles.subtitulo]}>
            Últimos gastos
          </Text>

          <View style={styles.cartao}>
            {resumo.ultimos_gastos.length === 0 ? (
              <EstadoVazio icone="receipt" texto="Nenhum gasto neste mês ainda." />
            ) : (
              // Poucos itens (os últimos gastos), então um map simples basta;
              // FlatList dentro de ScrollView não é recomendado
              resumo.ultimos_gastos.map((gasto, indice) => {
                // O ícone vem do nome em inglês (categoria_original), que não
                // muda com a tradução; o texto mostrado é a categoria em português
                const icone = iconeDaCategoria(gasto.categoria_original);
                return (
                  <View
                    key={gasto.id}
                    accessible
                    accessibilityLabel={`${gasto.descricao}, gasto de ${emReais(gasto.valor)}, ${formatarData(gasto.data)}, ${gasto.nome_banco}, categoria ${gasto.categoria}`}
                    // Divisória só entre itens (o primeiro não tem linha em cima)
                    style={[styles.gasto, indice > 0 && styles.gastoComDivisoria]}
                  >
                    {/* Círculo da categoria: só desenho, escondido do leitor de tela */}
                    <View
                      testID={`icone-categoria-${icone.icone}`}
                      importantForAccessibility="no-hide-descendants"
                      accessibilityElementsHidden
                      style={[styles.icone, { backgroundColor: icone.fundo }]}
                    >
                      <Lucide name={icone.icone} size={16} color={icone.cor} />
                    </View>
                    <View style={styles.gastoMeio}>
                      <Text style={textos.corpo}>{gasto.descricao}</Text>
                      <Text style={textos.detalhe}>
                        {`${formatarData(gasto.data)} · ${gasto.nome_banco} · ${gasto.categoria}`}
                      </Text>
                    </View>
                    <Text style={[textos.valor, styles.negativo]}>{reais(gasto.valor)}</Text>
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

        {planoAberto && (
          <FolhaDoPlano aoCancelar={() => setPlanoAberto(false)} aoSalvar={aoSalvarPlano} />
        )}
      </SafeAreaView>
    </ProvedorDeValores>
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
  textoCentro: {
    textAlign: 'center',
  },
  cabecalho: {
    // Textos à esquerda e o olho à direita, alinhados pelo topo
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaco.pequeno,
  },
  cabecalhoTextos: {
    // Título e linhas de detalhe juntos, mais perto entre si do que dos blocos.
    // flex: 1 deixa os textos com todo o espaço que o olho não usa
    flex: 1,
    gap: espaco.minimo,
  },
  textoAvisoCurto: {
    color: cores.aviso,
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
  positivo: {
    color: cores.positivo,
  },
  negativo: {
    color: cores.negativo,
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
  gastoMeio: {
    flex: 1,
    gap: 2,
  },
});
