// O relatório de um mês escolhido pelas setas da tela Relatório: busca
// /api/relatorio/?mes=AAAA-MM e mostra carregando, erro ou o conteúdo.
//
// A tela desenha este componente com key={mes}, como a ListaDeTransacoes:
// quando o mês muda, o React troca o componente por um novo, que começa do
// zero em "carregando", e o useCarga ignora a resposta que o antigo ainda
// esperava. Assim só o conteúdo mostra carregando, e o cabeçalho fica parado.
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { buscarRelatorio } from '@/api';
import Carregando from '@/componentes/Carregando';
import ConteudoDoRelatorio from '@/componentes/ConteudoDoRelatorio';
import MensagemDeErro from '@/componentes/MensagemDeErro';
import { ENTRADA_DO_CONTEUDO } from '@/movimento';
import { useCarga } from '@/useCarga';

type RelatorioDoMesProps = {
  mes: string; // "2026-09"
};

export default function RelatorioDoMes({ mes }: RelatorioDoMesProps) {
  // useCallback guarda a mesma função enquanto o mês não muda, como o
  // useCarga pede (senão ele buscaria de novo a cada renderização)
  const buscar = useCallback(() => buscarRelatorio(mes), [mes]);
  const { estado, recarregar, atualizar, atualizando, falhouAoAtualizar } = useCarga(buscar);

  if (estado.tipo === 'carregando') {
    return <Carregando texto="Carregando o relatório..." />;
  }

  if (estado.tipo === 'erro') {
    // "Tentar de novo" busca o mesmo mês outra vez
    return <MensagemDeErro erro={estado.erro} aoTentarDeNovo={recarregar} />;
  }

  return (
    // FadeIn só quando o conteúdo aparece (a key do mês o monta de novo a cada
    // troca); flex: 1 para a rolagem continuar ocupando o espaço todo
    <Animated.View entering={ENTRADA_DO_CONTEUDO} style={styles.area}>
      <ConteudoDoRelatorio
        relatorio={estado.dados}
        atualizar={atualizar}
        atualizando={atualizando}
        falhouAoAtualizar={falhouAoAtualizar}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
});
