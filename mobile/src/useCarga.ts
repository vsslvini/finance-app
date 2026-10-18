// Hook com a lógica repetida das abas Transações, Cartões e Contas: buscar os
// dados quando a tela aparece, mostrar carregando ou erro, tentar de novo e
// "puxar para baixo" sem apagar o que já está na tela.
//
// O nome começa com "use" (e não "usar") de propósito: é assim que o React e o
// lint reconhecem um hook. Com outro nome, o lint acusaria o useState aqui dentro.
import { useEffect, useState } from 'react';

import { ErroApi, type TipoErroApi } from '@/api';

// A área de dados está sempre em um destes três estados (como na tela Início)
export type EstadoDaCarga<T> =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; erro: TipoErroApi }
  | { tipo: 'sucesso'; dados: T };

// Chama a busca e devolve o próximo estado (nunca lança erro)
async function carregar<T>(buscar: () => Promise<T>): Promise<EstadoDaCarga<T>> {
  try {
    const dados = await buscar();
    return { tipo: 'sucesso', dados };
  } catch (erro) {
    // Erro inesperado (que não seja ErroApi) é tratado como erro do servidor
    const tipo = erro instanceof ErroApi ? erro.tipo : 'servidor';
    return { tipo: 'erro', erro: tipo };
  }
}

// "buscar" precisa ser sempre a mesma função entre renderizações (uma função
// da api.ts, como buscarContas, ou uma feita com useCallback). Se mudasse a
// cada renderização, o useEffect abaixo buscaria os dados sem parar.
export function useCarga<T>(buscar: () => Promise<T>) {
  const [estado, setEstado] = useState<EstadoDaCarga<T>>({ tipo: 'carregando' });
  // true enquanto o "puxar para baixo" está buscando (mostra o indicador)
  const [atualizando, setAtualizando] = useState(false);
  // true quando a última tentativa de puxar para baixo falhou (mostra o aviso)
  const [falhouAoAtualizar, setFalhouAoAtualizar] = useState(false);

  // useEffect porque buscar dados no servidor é um efeito externo: precisa
  // acontecer quando a tela aparece, e não a cada renderização.
  useEffect(() => {
    // Se a tela sair antes da resposta chegar, a resposta é ignorada. Na tela
    // Transações, é isso que garante que só o último mês pedido entra na tela
    let ativo = true;
    carregar(buscar).then((novoEstado) => {
      if (ativo) {
        setEstado(novoEstado);
      }
    });
    return () => {
      ativo = false;
    };
  }, [buscar]);

  // "Tentar de novo": volta para carregando e busca outra vez
  function recarregar() {
    setEstado({ tipo: 'carregando' });
    setFalhouAoAtualizar(false);
    carregar(buscar).then(setEstado);
  }

  // Puxar para baixo: busca de novo sem passar por 'carregando'. Os dados
  // antigos ficam na tela até os novos chegarem; se falhar, continuam lá e
  // aparece só o aviso curto.
  async function atualizar() {
    setAtualizando(true);
    try {
      const dados = await buscar();
      setEstado({ tipo: 'sucesso', dados });
      // Deu certo: some o aviso de uma falha anterior, se houver
      setFalhouAoAtualizar(false);
    } catch {
      setFalhouAoAtualizar(true);
    } finally {
      // Deu certo ou não, o indicador de "atualizando" some
      setAtualizando(false);
    }
  }

  return { estado, recarregar, atualizar, atualizando, falhouAoAtualizar };
}
