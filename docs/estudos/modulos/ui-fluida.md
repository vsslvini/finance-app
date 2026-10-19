# Módulo 19: UI fluida

Escrito em 2026-10-18. Pedido do Vinicius: o app estava "cru". Primeiro módulo feito com o agente
`ui-art-director` (`.claude/agents/ui-art-director.md`). Plano em
[`../../planos/modulo-19-ui-fluida.md`](../../planos/modulo-19-ui-fluida.md); as regras de
movimento ficam na seção 10 do [`../../design.md`](../../design.md).
**Antes, estude** [`embelezamento.md`](embelezamento.md) (Módulo 13: o Reanimated, `withTiming`,
animações de entrada e "reduzir movimento").

## 1. O que o módulo entrega

19a (commit `bc54f95`):

- **Barra de abas própria** (`src/componentes/BarraDeAbas.tsx`): Início no centro, uma bolha que
  desliza até a aba tocada com mola, o ícone ativo cresce e fica roxo, vibração leve.
- **`Tocavel`**: botões e cartões tocáveis encolhem um pouco com mola ao toque.
- **Esqueleto com brilho** e **ícone que respira** nos estados vazios.

19b:

- **Início**: o "posso gastar" num cartão com gradiente roxo e um brilho que respira atrás; a
  régua de dias em linha SVG que se desenha; o **olho** que esconde os valores ("R$ ••••").
- **Barras de progresso** e o **anel da % da renda** (cartão "Por mês") em SVG que se desenham.
- **Listas** que deslizam quando um item muda de lugar e esmaecem quando um some.
- **Marcar pago**: o ícone gira de leve, o celular vibra e, no gasto fixo, um check em Lottie.
- **Lottie** própria nos vazios principais (uma moeda que flutua).

Dependências novas: `react-native-svg`, `expo-haptics`, `expo-linear-gradient`,
`lottie-react-native` (todas funcionam no Expo Go).

## 2. Conceitos novos

- **Mola (`withSpring`)**: em vez de uma duração fixa, o movimento segue uma mola com
  amortecimento (`damping`) e rigidez (`stiffness`). Amortecimento alto quase não quica. As molas
  do app têm nome em `src/movimento.ts` (`MOLA_SUAVE` para a bolha, `MOLA_TOQUE` para o toque).
- **Linha que se desenha (`strokeDashoffset`)**: uma linha SVG tracejada com um traço do tamanho
  da linha inteira e um buraco do mesmo tamanho. Mexendo no `strokeDashoffset` (de "todo buraco"
  até "todo traço"), a linha parece se desenhar. O `useAnimatedProps` do Reanimated anima essa
  propriedade, que não é um estilo.
- **`sharedValue.set(...)`**: o lint do React Compiler recusa `x.value = ...` dentro de funções
  de evento (acha que é mudar algo que o React considera fixo). O `set` faz a mesma coisa de um
  jeito que o lint aceita.
- **Contexto do React** (`src/valoresVisiveis.tsx`): o olho guarda "visível ou escondido" num
  lugar só, e cada componente do Início pergunta com `useDinheiro()` como formatar o dinheiro.
  Sem contexto, cada componente receberia mais uma prop.
- **Layout animations** (`LinearTransition`, `FadeOut`): o Reanimated anima sozinho a mudança de
  posição ou a saída de um elemento; basta passar `layout` e `exiting`.
- **Lottie**: uma animação descrita em JSON (camadas, formas, quadros-chave). Os dois arquivos em
  `mobile/assets/animacoes/` foram escritos no projeto, nas cores do tema.

## 3. A barra de abas, do toque à tela

1. `src/app/(abas)/_layout.tsx` passa `tabBar={(props) => <BarraDeAbas {...props} />}` ao `Tabs`.
   A ordem das `Tabs.Screen` é a ordem na barra. Como o Início deixou de ser o primeiro,
   `initialRouteName: 'index'` garante que o app abre nele, e `backBehavior="initialRoute"` faz o
   "voltar" do Android ir para o Início.
2. A barra mede a própria largura (`onLayout`) e calcula onde fica cada aba.
3. Ao tocar, ela avisa a navegação (`tabPress`) e chama `navigate`, como a barra padrão faz.
4. Quando a aba ativa muda, a posição da bolha vai até a nova com `withSpring`, e cada aba anima
   o próprio `progresso` de 0 a 1 (escala do ícone, troca de cor, rótulo).

## 4. Regras que continuam

- Valores em dinheiro aparecem prontos (nada de contar de 0 até o valor).
- "Reduzir movimento" é sempre respeitado: molas e entradas usam `ReduceMotion.System`, e os loops
  nem começam (`useMovimentoReduzido`, em `src/movimento.ts`, que no Jest devolve `false`).
- Tudo o que só enfeita fica escondido do leitor de tela.

## 5. Os testes

- `__tests__/rotas-test.tsx`: as 5 abas na ordem nova com o Início no centro; o app abre com o
  Início selecionado; tocar numa aba navega e a marca como selecionada (`toBeSelected()`).
  Dois ajustes no caminho: `toHaveAccessibilityState` não existe nesta versão da biblioteca de
  testes, e o `getByRole('tablist')` não acha um contêiner que não é "acessível" (marcá-lo assim
  juntaria as 5 abas num item só para o leitor de tela).
- `__tests__/vibrar-test.ts`: as funções de vibração não lançam erro com o pacote simulado,
  quando o pacote lança erro, quando a promessa é recusada e na web.
- `__tests__/tela-inicio-test.tsx`: o olho esconde e mostra os valores (texto e o que o leitor de
  tela fala), inclusive o "posso gastar".
- `__tests__/dividas-test.tsx`: o anel mostra "30,7%" e "da renda" só com renda; o vazio animado
  sem dívidas; o check depois de "Marcar pago".
- `__tests__/transacoes-test.tsx`: o vazio animado sem transações.
- **Dublê do Lottie** em `mobile/testes/configurar-reanimated.ts`: no Node não existe o
  componente nativo, então o dublê desenha uma `View` com o mesmo `testID`.

Não dá para testar no Jest: o fim da animação de sucesso (depende do aparelho) e os ramos de
"reduzir movimento". Isso se confere no celular.

## 6. Para conferir no celular

- A bolha desliza sem quicar demais? O contraste dela contra a barra está bom?
- O brilho do carregamento e o do "posso gastar" estão suaves?
- A moeda do vazio (aba A pagar sem dívidas) e o check ao marcar um fixo como pago tocam?
- Ligue "remover animações" nas configurações de acessibilidade do Android e veja tudo parado.
