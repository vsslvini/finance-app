# Plano do Módulo 19: UI fluida e premium

Pedido do Vinicius em 2026-10-18: o app está "cru"; quer a interface fluida e bonita, no nível de
apps como Nubank e Apple Wallet, com o agente novo `ui-art-director`. Ele aprovou instalar o que
for preciso. Decisões do Claude no modo autônomo.

## Dependências (instaladas em 2026-10-18 com `npx expo install`)

- `react-native-svg` 15.15.4: linhas e anéis que se desenham (`strokeDashoffset`).
- `expo-haptics` ~57.0.3: vibração leve ao trocar de aba e ao confirmar ações; dá a sensação
  "física" dos apps premium.
- `expo-linear-gradient` ~57.0.2: o cartão de destaque do Início com gradiente roxo.
- `lottie-react-native` ~7.3.8 (aprovado pelo Vinicius depois): animações dos estados vazios e
  de sucesso. Os arquivos de animação (JSON) são **feitos no projeto**, simples e nas cores do
  tema, em `mobile/assets/animacoes/`, para não depender de arquivos de fora com licença de
  terceiros.

Os quatro funcionam no Expo Go do SDK 57 (não precisam de build próprio).

## Regras de movimento que mudam (`docs/design.md`, seção 10)

- Mola (`withSpring`) passa a valer para a bolha da tab bar e para ícones que reagem ao toque,
  com amortecimento alto (quique quase imperceptível).
- A troca de aba passa a animar a bolha e o ícone (o conteúdo da tela continua sem animação).
- Loops contínuos sutis (respirar, brilho do esqueleto) passam a valer em destaques, sempre
  parando com "reduzir movimento".
- Continua: valores em dinheiro aparecem prontos; "reduzir movimento" é sempre respeitado; nada
  de animação acima de 500 ms, exceto os loops.

## 19a: base e tab bar (`ui-art-director`)

1. **Tab bar própria** (`tabBar` do `Tabs`): ordem Transações, Cartões, **Início no centro**,
   Contas, A pagar. O app continua abrindo no Início. Bolha atrás do ícone ativo que desliza com
   `translateX` (mola); o ícone ativo cresce um pouco e muda de cor junto; vibração leve
   (`selectionAsync`) ao trocar. Acessibilidade: cada aba com papel `tab`, nome igual ao título
   e estado `selected`.
2. **Peças compartilhadas** em `src/movimento.ts` (molas e durações nomeadas) e um ajudante de
   vibração (`src/vibrar.ts`) que não quebra onde não há vibração (web, testes).
3. **Toque**: `Botao` e cartões tocáveis com escala animada (mola curta) no lugar da troca
   imediata; vibração leve nos botões principais.
4. **Esqueleto com brilho** (shimmer) no carregamento, no lugar do pulso.
5. **Estado vazio vivo**: o ícone do `EstadoVazio` "respira" (escala e opacidade em loop sutil).

## 19b: telas (`ui-art-director`, depois do 19a)

1. **Início**: o destaque "posso gastar" num cartão com gradiente roxo e um brilho que respira
   atrás quando o valor é positivo; a régua de dias vira uma linha SVG que se desenha até o dia
   de hoje; o gasto previsto e os cartões entram em cascata (já existe).
2. **Barras de progresso** em SVG que se desenham (dívidas, guardado, % da renda).
3. **Listas** (transações, gastos fixos, dívidas, parcelas): `LinearTransition` ao reordenar e
   `FadeOut` ao remover, para nada sumir de repente.
4. **A pagar**: o cartão "Por mês" com anel SVG da % da renda que se desenha; marcar pago com
   o ícone que gira e vibra.
5. **Lottie**: animações próprias (JSON em `mobile/assets/animacoes/`) nos estados vazios
   principais e um "check" de sucesso ao marcar um pagamento; paradas no último quadro com
   "reduzir movimento".
6. **Ícone de olho** no Início para esconder os valores (troca suave entre `eye` e `eye-off`;
   os valores viram "R$ ••••"). Guardado só na memória da sessão, sem dependência nova.

## Casos de teste (Jest, `mobile-tester`)

1. A tab bar mostra as 5 abas na ordem nova, com Início no centro, e o app abre no Início.
2. Tocar numa aba navega para ela e a marca como selecionada (`selected`).
3. Com "reduzir movimento", nada quebra (os testes rodam com a versão simulada do Reanimated).
4. O ajudante de vibração não quebra sem o módulo nativo.
5. O olho esconde e mostra os valores do Início ("R$ ••••" no lugar dos valores) e o rótulo do
   botão muda ("Esconder valores" e "Mostrar valores").
6. Os testes existentes continuam passando (textos e rótulos de acessibilidade iguais).
