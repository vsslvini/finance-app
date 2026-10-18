// Folha "Nova dívida": para quem, motivo, valor total, parcelas e o mês da
// primeira. Confere os campos no app antes de chamar a API; ao salvar, o backend
// gera as parcelas. A prévia mostra o valor de cada parcela enquanto a pessoa digita.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { criarDivida, type NovaDivida } from '@/api';
import Botao from '@/componentes/Botao';
import CampoDeTexto from '@/componentes/CampoDeTexto';
import Folha from '@/componentes/Folha';
import { formatarMes, formatarReais, hojeNoCelular, lerMes, lerReais } from '@/formatacao';
import { mensagemDoErro } from '@/mensagens';
import { cores, espaco, textos } from '@/tema';

const MAXIMO_DE_PARCELAS = 120;

type CampoDaDivida = 'credor' | 'valor' | 'parcelas' | 'mes';
type ErroDaFolha = { mensagem: string; campo: CampoDaDivida | null };

// "300" digitado como parcelas -> 300; qualquer coisa que não seja um número
// inteiro entre 1 e 120 -> null
function lerParcelas(texto: string): number | null {
  const limpo = texto.trim();
  if (!/^\d+$/.test(limpo)) {
    return null;
  }
  const numero = Number(limpo);
  return numero >= 1 && numero <= MAXIMO_DE_PARCELAS ? numero : null;
}

// Centavos inteiros -> "333.34" (o formato que o formatarReais entende)
function centavosParaTexto(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  return `${reais}.${String(centavos % 100).padStart(2, '0')}`;
}

// A prévia, em centavos inteiros (sem decimais do JavaScript): cada parcela é o
// total dividido, arredondado para baixo, e a última leva a sobra.
// "1000.00" e 3 -> "3x de R$ 333,33 (a última de R$ 333,34)"
function textoDaPrevia(valor: string, parcelas: number): string {
  const [reais, centavosTexto] = valor.split('.');
  const totalEmCentavos = Number(reais) * 100 + Number(centavosTexto);
  const base = Math.floor(totalEmCentavos / parcelas);
  const sobra = totalEmCentavos - base * parcelas;
  const parcelaComum = formatarReais(centavosParaTexto(base));
  if (parcelas === 1 || sobra === 0) {
    return `${parcelas}x de ${parcelaComum}`;
  }
  const ultima = formatarReais(centavosParaTexto(base + sobra));
  return `${parcelas}x de ${parcelaComum} (a última de ${ultima})`;
}

// Tenta ler um valor em reais; null se estiver vazio ou inválido
function valorOuNulo(texto: string): string | null {
  try {
    return lerReais(texto);
  } catch {
    return null;
  }
}

// Confere os campos na ordem da tela e devolve a dívida para a API ou o erro do
// primeiro campo com problema (aí a API nem é chamada)
function lerDivida(
  credor: string,
  motivo: string,
  textoValor: string,
  textoParcelas: string,
  textoMes: string,
): { divida: NovaDivida } | { erro: ErroDaFolha } {
  if (credor.trim() === '') {
    return { erro: { mensagem: 'Informe para quem é a dívida.', campo: 'credor' } };
  }

  const valor = valorOuNulo(textoValor);
  if (valor === null) {
    return { erro: { mensagem: 'Digite um valor, ex.: 500,00.', campo: 'valor' } };
  }
  // Sem nenhum dígito de 1 a 9, o valor é zero
  if (!/[1-9]/.test(valor)) {
    return { erro: { mensagem: 'O valor precisa ser maior que zero.', campo: 'valor' } };
  }

  const parcelas = lerParcelas(textoParcelas);
  if (parcelas === null) {
    return { erro: { mensagem: 'As parcelas precisam ficar entre 1 e 120.', campo: 'parcelas' } };
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

  return {
    divida: {
      credor: credor.trim(),
      motivo: motivo.trim(),
      valor_total: valor,
      parcelas,
      mes_inicio: mes,
    },
  };
}

type FolhaDeNovaDividaProps = {
  aoCancelar: () => void;
  aoSalvar: () => void; // chamada depois que o backend aceitou a dívida
};

export default function FolhaDeNovaDivida({ aoCancelar, aoSalvar }: FolhaDeNovaDividaProps) {
  const [credor, setCredor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [textoValor, setTextoValor] = useState('');
  const [textoParcelas, setTextoParcelas] = useState('1');
  // Começa com o mês atual do celular, no formato do campo: "10/2026"
  const [textoMes, setTextoMes] = useState(() => formatarMes(hojeNoCelular().slice(0, 7)));
  const [erro, setErro] = useState<ErroDaFolha | null>(null);
  const [salvando, setSalvando] = useState(false);

  // A prévia é calculada durante a renderização, a partir dos campos: só
  // aparece com valor maior que zero e parcelas válidas
  const valorDaPrevia = valorOuNulo(textoValor);
  const parcelasDaPrevia = lerParcelas(textoParcelas);
  const previa =
    valorDaPrevia !== null && /[1-9]/.test(valorDaPrevia) && parcelasDaPrevia !== null
      ? textoDaPrevia(valorDaPrevia, parcelasDaPrevia)
      : null;

  async function salvar() {
    const resultado = lerDivida(credor, motivo, textoValor, textoParcelas, textoMes);
    if ('erro' in resultado) {
      setErro(resultado.erro);
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      await criarDivida(resultado.divida);
      // Deu certo: a aba fecha a folha e relê a lista
      aoSalvar();
    } catch (erroDaApi) {
      // Deu errado: a folha continua aberta, com a mensagem embaixo dos campos
      setErro({ mensagem: mensagemDoErro(erroDaApi), campo: null });
      setSalvando(false);
    }
  }

  // Ao digitar em qualquer campo, a mensagem de erro antiga some
  function digitar(trocar: (texto: string) => void) {
    return (novoTexto: string) => {
      trocar(novoTexto);
      setErro(null);
    };
  }

  return (
    // A folha não passa de 85% da altura da tela; o que sobrar dos campos rola
    <Folha aoFechar={aoCancelar} alturaMaxima="85%">
      <Text accessibilityRole="header" style={textos.subtitulo}>
        Nova dívida
      </Text>
      <Text style={[textos.corpo, styles.explicacao]}>
        Cada parcela conta como saída no mês dela até você marcar como paga.
      </Text>

      {/* Os campos rolam, para os botões ficarem sempre à vista */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.rolagem}
        contentContainerStyle={styles.campos}
      >
        {/* Os nomes visíveis ficam escondidos do leitor de tela, porque o
            próprio campo já é lido com o mesmo nome (accessibilityLabel) */}
        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Para quem
          </Text>
          <CampoDeTexto
            rotulo="Para quem"
            teclado="default"
            valor={credor}
            aoDigitar={digitar(setCredor)}
            comErro={erro?.campo === 'credor'}
          />
        </View>

        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Motivo (opcional)
          </Text>
          <CampoDeTexto
            rotulo="Motivo (opcional)"
            teclado="default"
            valor={motivo}
            aoDigitar={digitar(setMotivo)}
            comErro={false}
          />
        </View>

        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Valor total
          </Text>
          <CampoDeTexto
            rotulo="Valor total"
            teclado="decimal-pad"
            valor={textoValor}
            aoDigitar={digitar(setTextoValor)}
            comErro={erro?.campo === 'valor'}
          />
        </View>

        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Parcelas
          </Text>
          <CampoDeTexto
            rotulo="Parcelas"
            teclado="number-pad"
            valor={textoParcelas}
            aoDigitar={digitar(setTextoParcelas)}
            comErro={erro?.campo === 'parcelas'}
          />
        </View>

        <View style={styles.blocoCampo}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={textos.rotulo}>
            Mês da primeira parcela (MM/AAAA)
          </Text>
          {/* Teclado com números e barra; no Android vira o teclado comum */}
          <CampoDeTexto
            rotulo="Mês da primeira parcela (MM/AAAA)"
            teclado="numbers-and-punctuation"
            valor={textoMes}
            aoDigitar={digitar(setTextoMes)}
            comErro={erro?.campo === 'mes'}
          />
        </View>

        {previa !== null && <Text style={textos.detalhe}>{previa}</Text>}

        {/* Uma mensagem só, embaixo dos campos */}
        {erro !== null && (
          <Text accessibilityLiveRegion="polite" style={[textos.detalhe, styles.mensagemErro]}>
            {erro.mensagem}
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
