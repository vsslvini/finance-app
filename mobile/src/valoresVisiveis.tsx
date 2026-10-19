// Esconder os valores do Início (Módulo 19b, ícone de olho). Com os valores
// escondidos, todo valor em dinheiro do Início vira "R$ ••••", para a pessoa
// poder abrir o app perto de outras sem mostrar quanto tem.
//
// Por que um contexto (createContext): o Início desenha valores em vários
// componentes (destaque, cartão do previsto, seção Guardado). Passar
// "visiveis" de prop em prop seria repetitivo; o contexto deixa o valor
// disponível para qualquer componente de dentro, que lê com useDinheiro().
//
// O padrão do contexto é "visíveis" (true). Assim um componente desenhado fora
// do Início (ou num teste, sem o provedor) mostra os valores normalmente.
// O estado mora só na memória (useState no Início): ao fechar o app, os valores
// voltam a aparecer.
import { createContext, useContext, type ReactNode } from 'react';

import { formatarNumero, formatarReais, rotuloEmReais } from '@/formatacao';

// O que aparece no lugar de um valor escondido
export const VALOR_ESCONDIDO = 'R$ ••••';
// O que o leitor de tela fala no lugar do valor (ler "pontinho" não ajuda)
const ESCONDIDO_PARA_O_LEITOR = 'valor escondido';

const ContextoDosValores = createContext(true);

type ProvedorDeValoresProps = {
  visiveis: boolean;
  children: ReactNode;
};

// Envolve a parte da tela que obedece ao olho. No React 19 o próprio contexto
// serve de provedor (<Contexto value={...}>), sem o ".Provider" antigo.
export function ProvedorDeValores({ visiveis, children }: ProvedorDeValoresProps) {
  return <ContextoDosValores value={visiveis}>{children}</ContextoDosValores>;
}

// As funções de formatar dinheiro, já sabendo se os valores estão escondidos.
// Os nomes acompanham as funções de formatacao.ts que elas substituem.
export type Dinheiro = {
  visiveis: boolean;
  // Igual a formatarReais: "R$ 1.250,50" (ou "R$ ••••")
  reais: (valor: string) => string;
  // Igual a rotuloEmReais: "Saldo: 1.250,50 reais" (ou "Saldo: valor escondido")
  rotulo: (nome: string, valor: string) => string;
  // Para frases do leitor de tela: "333,33 reais" (ou "valor escondido")
  emReais: (valor: string) => string;
};

// Monta as funções para um estado. A tela Início usa direto, porque ela mesma
// guarda o estado e fica por fora do próprio provedor; os componentes de
// dentro usam o useDinheiro() abaixo.
export function criarDinheiro(visiveis: boolean): Dinheiro {
  if (visiveis) {
    return {
      visiveis,
      reais: formatarReais,
      rotulo: rotuloEmReais,
      emReais: (valor) => `${formatarNumero(valor)} reais`,
    };
  }
  return {
    visiveis,
    reais: () => VALOR_ESCONDIDO,
    rotulo: (nome) => `${nome}: ${ESCONDIDO_PARA_O_LEITOR}`,
    emReais: () => ESCONDIDO_PARA_O_LEITOR,
  };
}

// Hook para os componentes do Início: lê o contexto e devolve as funções
export function useDinheiro(): Dinheiro {
  return criarDinheiro(useContext(ContextoDosValores));
}
