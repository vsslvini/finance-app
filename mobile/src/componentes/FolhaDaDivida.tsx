// Folha da dívida: a lista de parcelas (tocar marca ou desmarca como paga) e o
// botão de apagar, que pede dois toques. A folha parte da dívida que a aba já
// tem e a troca pela resposta do backend a cada parcela marcada.
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apagarDivida, marcarParcela, type Divida, type ParcelaDaDivida } from '@/api';
import Botao from '@/componentes/Botao';
import { formatarNumero, formatarReais, mesPorExtenso, tituloDoMes } from '@/formatacao';
import { mensagemDoErro } from '@/mensagens';
import { cantos, cores, espaco, fundoEscurecido, textos, toque } from '@/tema';

type FolhaDaDividaProps = {
  divida: Divida;
  // "mudou" é true se alguma parcela foi marcada ou desmarcada (a aba relê a lista)
  aoFechar: (mudou: boolean) => void;
  aoApagar: () => void; // chamada depois que o backend apagou a dívida
};

export default function FolhaDaDivida({
  divida: dividaInicial,
  aoFechar,
  aoApagar,
}: FolhaDaDividaProps) {
  const [divida, setDivida] = useState(dividaInicial);
  const [mudou, setMudou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // true durante qualquer pedido (marcar ou apagar): desativa as linhas
  const [salvando, setSalvando] = useState(false);
  // true depois do primeiro toque em "Apagar dívida"
  const [confirmando, setConfirmando] = useState(false);

  // Tocar numa parcela: manda o PATCH e troca a dívida pela resposta. Se
  // falhar, a dívida continua como estava e aparece a mensagem.
  async function alternar(parcela: ParcelaDaDivida) {
    if (salvando) {
      return;
    }
    // Tocar numa parcela cancela a confirmação de apagar
    setConfirmando(false);
    setErro(null);
    setSalvando(true);
    try {
      const nova = await marcarParcela(parcela.id, !parcela.paga);
      setDivida(nova);
      setMudou(true);
    } catch (erroDaApi) {
      setErro(mensagemDoErro(erroDaApi));
    } finally {
      setSalvando(false);
    }
  }

  // Primeiro toque: pede a confirmação. Segundo toque: apaga de verdade.
  async function apagar() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await apagarDivida(divida.id);
      aoApagar();
    } catch (erroDaApi) {
      setErro(mensagemDoErro(erroDaApi));
      setConfirmando(false);
      setSalvando(false);
    }
  }

  const motivo = divida.motivo.trim();
  const avisoDeApagar =
    divida.total_parcelas === 1
      ? 'A parcela também será apagada.'
      : `As ${divida.total_parcelas} parcelas também serão apagadas.`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => aoFechar(mudou)}>
      <View style={styles.fundo}>
        <SafeAreaView edges={['bottom']} style={styles.folha}>
          <Text accessibilityRole="header" style={textos.subtitulo}>
            {divida.credor}
          </Text>
          {motivo !== '' && <Text style={textos.detalhe}>{motivo}</Text>}
          <Text style={textos.rotulo}>
            {`${formatarReais(divida.valor_total)} em ${divida.total_parcelas}x · falta ${formatarReais(divida.valor_restante)}`}
          </Text>

          {/* extraData: a lista precisa redesenhar as linhas quando "salvando" muda */}
          <FlatList
            data={divida.parcelas}
            extraData={salvando}
            keyExtractor={(parcela) => String(parcela.id)}
            style={styles.lista}
            renderItem={({ item }) => (
              <LinhaDeParcela
                parcela={item}
                total={divida.total_parcelas}
                salvando={salvando}
                aoTocar={() => alternar(item)}
              />
            )}
          />

          {erro !== null && (
            <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.mensagemErro]}>
              {erro}
            </Text>
          )}
          {confirmando && <Text style={[textos.detalhe, styles.mensagemErro]}>{avisoDeApagar}</Text>}

          <View style={styles.botoes}>
            <View style={styles.botaoMetade}>
              <Botao titulo="Fechar" tipo="secundario" aoTocar={() => aoFechar(mudou)} />
            </View>
            <View style={styles.botaoMetade}>
              <Botao
                titulo={confirmando ? 'Toque de novo para apagar' : 'Apagar dívida'}
                tipo="principal"
                aoTocar={apagar}
                desativado={salvando}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

type LinhaDeParcelaProps = {
  parcela: ParcelaDaDivida;
  total: number;
  salvando: boolean;
  aoTocar: () => void;
};

// Uma linha da lista. Fica neste arquivo porque só esta folha usa.
function LinhaDeParcela({ parcela, total, salvando, aoTocar }: LinhaDeParcelaProps) {
  // Situação com ícone e texto (a cor sozinha não basta para quem não enxerga bem)
  let icone: LucideIconName;
  let situacao: string;
  let cor: ColorValue;
  if (parcela.paga) {
    icone = 'circle-check';
    situacao = 'Paga';
    cor = cores.acento;
  } else if (parcela.atrasada) {
    icone = 'triangle-alert';
    situacao = 'Atrasada';
    cor = cores.aviso;
  } else {
    icone = 'circle';
    situacao = 'A pagar';
    cor = cores.textoSecundario;
  }

  const rotulo =
    `Parcela ${parcela.numero} de ${total}, ${mesPorExtenso(parcela.mes)}, ` +
    `${formatarNumero(parcela.valor)} reais${parcela.atrasada ? ', atrasada' : ''}`;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={rotulo}
      accessibilityHint={parcela.paga ? 'Toque para desmarcar' : 'Toque para marcar como paga'}
      accessibilityState={{ checked: parcela.paga, disabled: salvando }}
      disabled={salvando}
      onPress={aoTocar}
      style={({ pressed }) => [styles.linha, (pressed || salvando) && toque.apertadoIcone]}
    >
      <View style={styles.linhaMeio}>
        <Text style={textos.corpo}>{`Parcela ${parcela.numero} de ${total}`}</Text>
        <Text style={textos.detalhe}>{tituloDoMes(parcela.mes)}</Text>
      </View>
      <View style={styles.linhaDireita}>
        <Text style={textos.valor}>{formatarReais(parcela.valor)}</Text>
        <View style={styles.situacao}>
          {/* Só desenho: o texto ao lado já diz a situação */}
          <Lucide
            name={icone}
            size={14}
            color={cor}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={[textos.rotulo, { color: cor }]}>{situacao}</Text>
        </View>
      </View>
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
  lista: {
    // flexShrink: com muitas parcelas, a lista encolhe e rola, deixando os
    // botões sempre à vista
    flexShrink: 1,
  },
  linha: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.medio,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
    paddingVertical: espaco.pequeno,
  },
  linhaMeio: {
    flex: 1,
  },
  linhaDireita: {
    alignItems: 'flex-end',
  },
  situacao: {
    flexDirection: 'row',
    alignItems: 'center',
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
