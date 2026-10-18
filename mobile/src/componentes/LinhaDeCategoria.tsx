// Uma linha da seção "Gastos por categoria" do Relatório: ícone, nome, valor e
// porcentagem na primeira linha, e embaixo a barra com a mesma porcentagem.
// Só leitura (não é botão).
import { Lucide } from '@react-native-vector-icons/lucide';
import { StyleSheet, Text, View } from 'react-native';

import type { CategoriaDoMes } from '@/api';
import { iconeDaCategoria } from '@/categorias';
import BarraDeProgresso from '@/componentes/BarraDeProgresso';
import { formatarReais, rotuloEmReais } from '@/formatacao';
import { cantos, cores, espaco, textos } from '@/tema';

type LinhaDeCategoriaProps = {
  categoria: CategoriaDoMes;
  // A primeira linha não tem divisória em cima; as outras têm
  comDivisoria: boolean;
};

export default function LinhaDeCategoria({ categoria, comDivisoria }: LinhaDeCategoriaProps) {
  // O ícone vem do nome em inglês (categoria_original), como na lista de
  // transações; o texto mostrado é o nome em português
  const icone = iconeDaCategoria(categoria.categoria_original);

  // O leitor de tela lê esta frase no lugar dos textos de dentro da linha:
  // "Transferência - PIX: 1.079,17 reais, 37 por cento"
  const rotulo =
    `${rotuloEmReais(categoria.categoria, categoria.total)}, ` +
    `${categoria.porcentagem} por cento`;

  return (
    <View
      accessible
      accessibilityLabel={rotulo}
      style={[styles.linha, comDivisoria && styles.divisoria]}
    >
      <View style={styles.topo}>
        {/* Círculo da categoria: só desenho, escondido do leitor de tela */}
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.icone, { backgroundColor: icone.fundo }]}
        >
          <Lucide name={icone.icone} size={16} color={icone.cor} />
        </View>
        <Text style={[textos.corpo, styles.nome]}>{categoria.categoria}</Text>
        <View style={styles.numeros}>
          <Text style={textos.valor}>{formatarReais(categoria.total)}</Text>
          <Text style={textos.rotulo}>{`${categoria.porcentagem}%`}</Text>
        </View>
      </View>
      {/* Sem rótulo próprio: a linha inteira já diz a porcentagem */}
      <BarraDeProgresso porcentagem={categoria.porcentagem} />
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    gap: espaco.pequeno,
    paddingVertical: espaco.medio,
  },
  divisoria: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.medio,
  },
  icone: {
    width: 30,
    height: 30,
    borderRadius: cantos.icone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nome: {
    // flex: 1 deixa o nome quebrar a linha sem empurrar o valor para fora
    flex: 1,
  },
  numeros: {
    // Valor em cima e porcentagem embaixo, alinhados à direita
    alignItems: 'flex-end',
  },
});
