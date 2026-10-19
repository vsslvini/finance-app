// Testes do ajudante de vibração (src/vibrar.ts), Módulo 19a, caso 4.
//
// A promessa do ajudante: vibrarSelecao, vibrarToque e vibrarSucesso NUNCA
// lançam erro, aconteça o que acontecer com o pacote expo-haptics (que mexe no
// motor de vibração do celular). Se uma tela chamasse a vibração e ela
// quebrasse, o app inteiro poderia travar por causa de um detalhe de
// "sensação". Por isso conferimos três situações.
//
// Sobre o mock: um mock é um dublê de teste, uma peça falsa que ocupa o lugar
// da verdadeira. Aqui usamos jest.doMock para trocar o expo-haptics por um
// falso que nós controlamos (ele pode funcionar, lançar erro ou recusar a
// promessa). Assim simulamos um celular com defeito sem precisar de um.
//
// Como cada teste usa um expo-haptics diferente, o vibrar.ts é carregado de
// novo a cada teste (jest.resetModules limpa o cache de módulos e o require
// dentro de carregar() importa o arquivo outra vez, já com o dublê escolhido).

import type { Platform as PlataformaTipo } from 'react-native';

const NOMES = ['vibrarSelecao', 'vibrarToque', 'vibrarSucesso'] as const;

// Carrega vibrar.ts do zero. Devolve também o Platform que ele enxerga, para
// o teste da web poder trocar o sistema (o resetModules cria um Platform novo,
// então precisa ser o mesmo que o vibrar.ts importou).
function carregar() {
  const { Platform } = require('react-native') as { Platform: typeof PlataformaTipo };
  const vibrar = require('@/vibrar') as typeof import('@/vibrar');
  return { vibrar, Platform };
}

// O dublê do expo-haptics: cada função devolve o que o teste mandar. Os
// enums (ImpactFeedbackStyle etc.) são o que o vibrar.ts lê do pacote.
function dubleDoHaptics(comportamento: () => Promise<void>) {
  const funcoes = {
    selectionAsync: jest.fn(comportamento),
    impactAsync: jest.fn(comportamento),
    notificationAsync: jest.fn(comportamento),
    ImpactFeedbackStyle: { Light: 'light' },
    NotificationFeedbackType: { Success: 'success' },
  };
  jest.doMock('expo-haptics', () => funcoes);
  return funcoes;
}

// Dá tempo de uma promessa recusada "escapar" antes de o teste terminar. Se o
// ajudante não tratasse a recusa, o Jest acusaria erro aqui.
const esperarUmTique = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.resetModules();
  // Desfaz um doMock de um teste anterior: sem isto, o dublê dele ficaria
  // valendo e o teste (a) não usaria o expo-haptics simulado do jest-expo.
  jest.dontMock('expo-haptics');
});

describe('Ajudante de vibração', () => {
  it('não lança erro com o expo-haptics simulado do jest-expo (19a, caso 4a)', async () => {
    // Prepara: nenhum dublê nosso; vale o módulo simulado que o jest-expo já
    // traz, que é o que as telas encontram quando rodam nos testes.
    const { vibrar } = carregar();

    // Faz e verifica: chamar as três funções não lança erro, nem na hora
    // nem depois (por isso o esperarUmTique).
    for (const nome of NOMES) {
      expect(() => vibrar[nome]()).not.toThrow();
    }
    await esperarUmTique();
  });

  it('não lança erro quando o expo-haptics lança erro na hora da chamada (19a, caso 4b)', async () => {
    // Prepara: um celular "com defeito", em que a vibração explode de
    // imediato (erro síncrono).
    const haptics = dubleDoHaptics(() => {
      throw new Error('sem motor de vibração');
    });
    const { vibrar } = carregar();

    // Faz e verifica: o try/catch do ajudante engole o erro. Conferimos também
    // que o pacote foi mesmo chamado (senão o teste passaria à toa).
    for (const nome of NOMES) {
      expect(() => vibrar[nome]()).not.toThrow();
    }
    await esperarUmTique();
    expect(haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('não lança erro quando a promessa do expo-haptics é recusada (19a, caso 4b)', async () => {
    // Prepara: agora o erro vem depois, como promessa recusada (rejeitada).
    const haptics = dubleDoHaptics(() => Promise.reject(new Error('vibração recusada')));
    const { vibrar } = carregar();

    // Faz e verifica: nada lança na chamada, e esperar um instante não gera
    // erro "não tratado" (o .catch do ajudante absorve a recusa).
    for (const nome of NOMES) {
      expect(() => vibrar[nome]()).not.toThrow();
    }
    await esperarUmTique();
    expect(haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('na web não chama o expo-haptics e não lança erro (19a, caso 4c)', async () => {
    // Prepara: um expo-haptics que funciona, mas fingimos estar na web.
    const haptics = dubleDoHaptics(() => Promise.resolve());
    const { vibrar, Platform } = carregar();
    const restaurar = jest.replaceProperty(Platform, 'OS', 'web');

    try {
      // Faz e verifica: nada lança e o pacote nunca é chamado, porque na web
      // não existe vibração.
      for (const nome of NOMES) {
        expect(() => vibrar[nome]()).not.toThrow();
      }
      await esperarUmTique();
      expect(haptics.selectionAsync).not.toHaveBeenCalled();
      expect(haptics.impactAsync).not.toHaveBeenCalled();
      expect(haptics.notificationAsync).not.toHaveBeenCalled();
    } finally {
      restaurar.restore();
    }
  });
});
