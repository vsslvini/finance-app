// renderRouter monta o Expo Router de verdade dentro do Jest, com as rotas
// que passarmos. screen, importado daqui, é a mesma "tela" da Testing
// Library. Importar este módulo também ensina ao expect os comparadores do
// Router, como o toHavePathname. O fireEvent (tocar, digitar) vem direto da
// Testing Library: o expo-router o repassa por dentro, mas não publica o tipo
// dele para o TypeScript.
import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

// Os arquivos de rota reais, pelo atalho @/ (que aponta para src/). Desde o
// módulo 6, as quatro telas ficam no grupo (abas): os parênteses no nome da
// pasta dizem ao Expo Router que ela organiza arquivos, mas não entra no
// endereço. Por isso a tela Início continua em "/" e não em "/abas".
import AbasLayout from '@/app/(abas)/_layout';
import CartoesScreen from '@/app/(abas)/cartoes';
import ContasScreen from '@/app/(abas)/contas';
import InicioScreen from '@/app/(abas)/index';
import TransacoesScreen from '@/app/(abas)/transacoes';
import RootLayout from '@/app/_layout';

// O layout raiz espera a fonte Manrope carregar (useFonts) e, enquanto isso,
// não desenha nada. No Jest não existe celular para carregar a fonte: o
// jest-expo só simula o módulo nativo de fontes, e o useFonts começa como
// "não carregado" e só muda depois de uma busca assíncrona. Para o teste não
// depender desse tempo, trocamos o pacote de fontes inteiro por um dublê em
// que a fonte já está carregada: useFonts devolve [true, null] (carregou,
// sem erro). As constantes (Manrope_400Regular etc.) viram só textos, porque
// o dublê de useFonts nem olha para elas.
//
// jest.mock('pacote', fábrica) troca o pacote para TODO o arquivo de teste.
// O Jest move essa chamada para o topo, antes dos imports, então o layout já
// recebe o dublê quando é importado.
jest.mock('@expo-google-fonts/manrope', () => ({
  useFonts: () => [true, null],
  Manrope_400Regular: 'Manrope_400Regular',
  Manrope_500Medium: 'Manrope_500Medium',
  Manrope_600SemiBold: 'Manrope_600SemiBold',
  Manrope_700Bold: 'Manrope_700Bold',
  Manrope_800ExtraBold: 'Manrope_800ExtraBold',
}));

// Dublê do pacote de ícones, igual ao de tela-inicio-test.tsx (a explicação
// completa está lá). Agora a barra de abas desenha um ícone Lucide em cada
// aba; o ícone de verdade só aparece depois de carregar a fonte Lucide, uma
// carga assíncrona que terminaria no meio do teste. O falso é um Text simples.
jest.mock('@react-native-vector-icons/lucide', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  function IconeFalso({ name, ...resto }: { name: string }) {
    return React.createElement(Text, resto, name);
  }
  return { __esModule: true, default: IconeFalso, Lucide: IconeFalso };
});

// Todas as telas buscam dados no backend assim que aparecem. Estes testes só
// querem saber se o Router achou a tela certa, então trocamos o fetch por um
// dublê (mock) que nunca responde: cada tela fica parada em "carregando", sem
// rede. Os detalhes de mock estão em tela-inicio-test.tsx.
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = jest.fn(() => new Promise<Response>(() => {}));
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  // O renderRouter liga o relógio falso do Jest; aqui voltamos ao de verdade.
  jest.useRealTimers();
});

// O "mapa de arquivos" em memória que o renderRouter monta. Cada chave é o
// caminho do arquivo dentro de src/app, sem a barra inicial e sem a
// extensão; cada valor é o componente daquele arquivo. É o mesmo desenho das
// pastas do app: o layout raiz, o layout das abas e as quatro telas.
const ARQUIVOS_DO_APP = {
  _layout: RootLayout,
  '(abas)/_layout': AbasLayout,
  '(abas)/index': InicioScreen,
  '(abas)/transacoes': TransacoesScreen,
  '(abas)/cartoes': CartoesScreen,
  '(abas)/contas': ContasScreen,
};

// ---------------------------------------------------------------------------
// Como achamos os botões das abas
//
// A mesma palavra aparece na aba e no título da tela (ex.: "Contas"), então
// procurar só pelo texto acharia duas coisas. Procuramos então do jeito que o
// leitor de tela acha a aba: pelo papel e pelo nome do botão.
//
// Quem desenha a barra é o React Navigation (que vem dentro do Expo Router).
// Conferimos na fonte dele (node_modules/expo-router/build/react-navigation/
// bottom-tabs/views/BottomTabBar.js e BottomTabItem.js): no iPhone, cada aba
// é um botão (papel "button") e o nome que o VoiceOver fala é
// "<rótulo>, tab, <posição> of <total>". O jest-expo simula um iPhone, por
// isso os nomes abaixo. (No Android o papel seria "tab" e o nome, só o
// rótulo.) A posição no nome ("2 of 4") também confere a ordem das abas.
// ---------------------------------------------------------------------------
const ABA_INICIO = 'Início, tab, 1 of 4';
const ABA_TRANSACOES = 'Transações, tab, 2 of 4';
const ABA_CARTOES = 'Cartões, tab, 3 of 4';
const ABA_CONTAS = 'Contas, tab, 4 of 4';

describe('Rotas e abas do app', () => {
  it('a barra mostra "Início", "Transações", "Cartões" e "Contas", nessa ordem (caso 1)', async () => {
    // Prepara: monta o app começando em "/". O await espera a primeira
    // tela terminar de desenhar.
    await renderRouter(ARQUIVOS_DO_APP, { initialUrl: '/' });

    // Verifica: existe um botão para cada aba, na posição certa.
    expect(screen.getByRole('button', { name: ABA_INICIO })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ABA_TRANSACOES })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ABA_CARTOES })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ABA_CONTAS })).toBeOnTheScreen();

    // Verifica também os rótulos que a pessoa vê embaixo dos ícones, de
    // cima para baixo (a ordem do getAllByText é a ordem na tela). O /^...$/
    // é uma expressão regular que pega só textos exatamente iguais a um dos
    // quatro nomes. As outras abas ainda não foram abertas (as abas só
    // desenham a tela quando ela é aberta pela primeira vez), então nenhum
    // título de tela entra nesta lista.
    const rotulos = screen.getAllByText(/^(Início|Transações|Cartões|Contas)$/);
    expect(rotulos).toHaveLength(4);
    expect(rotulos[0]).toHaveTextContent('Início');
    expect(rotulos[1]).toHaveTextContent('Transações');
    expect(rotulos[2]).toHaveTextContent('Cartões');
    expect(rotulos[3]).toHaveTextContent('Contas');
  });

  it('ao abrir, o endereço é "/" e aparece "Carregando o resumo..." (caso 2)', async () => {
    // Guardamos o retorno numa variável: no expo-router 57.0.25 com a
    // Testing Library 14, o getPathname() fica preso nesse retorno (uma
    // Promise), e não no screen como mostra a documentação.
    const app = renderRouter(ARQUIVOS_DO_APP, { initialUrl: '/' });
    await app;

    // Verifica: o endereço atual do Router é "/".
    // @ts-expect-error O expo-router adiciona o toHavePathname ao expect, mas
    // não publica o tipo dele para o TypeScript; o Jest roda normalmente.
    expect(app).toHavePathname('/');

    // Verifica: o arquivo (abas)/index foi o escolhido para "/", porque
    // aparece o primeiro estado da tela Início.
    expect(screen.getByText('Carregando o resumo...')).toBeOnTheScreen();
  });

  it('tocar em "Transações" leva a "/transacoes" e mostra "Carregando as transações..." (caso 3)', async () => {
    const app = renderRouter(ARQUIVOS_DO_APP, { initialUrl: '/' });
    await app;

    // Faz: toca na aba. Na Testing Library 14 o fireEvent.press é
    // assíncrono, por isso o await.
    await fireEvent.press(screen.getByRole('button', { name: ABA_TRANSACOES }));

    // Verifica: a tela Transações apareceu (findByText espera até 1 s)...
    expect(await screen.findByText('Carregando as transações...')).toBeOnTheScreen();
    // ...e o endereço mudou.
    // @ts-expect-error (mesmo motivo do teste anterior)
    expect(app).toHavePathname('/transacoes');
  });

  it('tocar em "Cartões" leva a "/cartoes" e mostra "Carregando os cartões..." (caso 4)', async () => {
    const app = renderRouter(ARQUIVOS_DO_APP, { initialUrl: '/' });
    await app;

    await fireEvent.press(screen.getByRole('button', { name: ABA_CARTOES }));

    expect(await screen.findByText('Carregando os cartões...')).toBeOnTheScreen();
    // @ts-expect-error (mesmo motivo do caso 2)
    expect(app).toHavePathname('/cartoes');
  });

  it('tocar em "Contas" leva a "/contas" e mostra "Carregando as contas..." (caso 5)', async () => {
    const app = renderRouter(ARQUIVOS_DO_APP, { initialUrl: '/' });
    await app;

    await fireEvent.press(screen.getByRole('button', { name: ABA_CONTAS }));

    expect(await screen.findByText('Carregando as contas...')).toBeOnTheScreen();
    // @ts-expect-error (mesmo motivo do caso 2)
    expect(app).toHavePathname('/contas');
  });
});
