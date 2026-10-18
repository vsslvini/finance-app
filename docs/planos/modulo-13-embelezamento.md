# Plano do Módulo 13: embelezamento (movimento e refinamento visual)

Pedido do Vinicius em 2026-10-17. Proposta do `mobile-ui-expert` em 2026-10-18; decisões do
Claude no modo autônomo.

## Decisões

- A biblioteca sugerida (hairline) é só para web (DOM) e não roda em React Native. O movimento
  usa a `react-native-reanimated` 4.5.1, que já está instalada. O "traço fino" vem dos ícones
  Lucide nos estados vazios. `react-native-svg` fica de fora por enquanto: os estados vazios quase
  não aparecem e o ícone dá a maior parte do efeito sem dependência nova.
- Não animam: valores em dinheiro (o "posso gastar" aparece pronto), puxar para baixo, troca de
  aba, itens de listas longas, régua de dias, erros e avisos.
- Componente-base `Folha` para as 5 folhas; fechar a folha continua instantâneo (animação de
  fechar fica para depois).
- Depois de salvar numa folha, o Início recarrega sem voltar para "carregando" (assim a cascata
  não se repete e a tela não pisca).
- Esqueleto de carregamento primeiro só no Início.
- Divisórias com `StyleSheet.hairlineWidth`: decidir vendo no celular (pendente do Vinicius).

## Princípios de movimento (vão para a seção "10. Movimento" do `docs/design.md`)

Durações de 150 a 500 ms (nada passa de 500 ms); `Easing.out(Easing.cubic)` ao entrar,
`Easing.in(Easing.cubic)` ao sair, sem mola com quique; toque instantâneo; "reduzir movimento"
respeitado (`ReduceMotion.System`, padrão no Reanimated 4; no `Modal`, `useReducedMotion()` troca
`slide` por `fade`); conteúdo animado acessível desde o primeiro quadro.

## Entrega 1 (sem Reanimated)

1. **Toque unificado**: cartões tocáveis e o `Botao` com opacidade 0,85 e escala 0,98 ao
   apertar (troca imediata); botões de ícone (setas, Voltar) só com opacidade 0,7. Um lugar só
   para esse estilo no `tema.ts` (ex.: `apertado` e `apertadoIcone`).
2. **Estados vazios com ícone de traço fino**: ícone Lucide de 40, cor `textoTerciario`, acima
   do texto, escondido do leitor de tela: "Nenhum gasto neste mês ainda." (`receipt`), "Nenhum
   cartão encontrado." (`credit-card`), "Nenhuma conta encontrada." (`landmark`), "Nenhuma
   dívida cadastrada." (`hand-coins`), "Nenhuma transação em ..." (`arrow-left-right`), "Nenhum
   gasto neste mês." do relatório (`receipt`). Um componente `EstadoVazio` (ícone + texto).
3. **`docs/design.md`**: seção "10. Movimento" (texto da proposta) e os ajustes da seção 9
   (ilustrações: ícone Lucide de 40 nos vazios).

Testes (entrega 1): os 181 atuais continuam verdes (os textos de vazio não mudam); um teste novo
por tela não é necessário. Conferir que o ícone do vazio fica escondido do leitor de tela (um
teste no Início: o texto do vazio continua achável e o ícone só aparece com
`includeHiddenElements`).

## Entrega 2 (Reanimated entra)

1. Pré-requisito: configurar o Reanimated no Jest (setup com `setUpTests()` e o mock do
   Worklets, registrado em `setupFilesAfterEnv`), rodando os 181 testes antes de qualquer tela.
   Na 4.5.1 instalada não existe a pasta `react-native-reanimated/jest/` que a documentação atual
   cita; usar o que existe (`setUpTests` exportado, `react-native-worklets/jest/resolver.js` ou o
   mock do Worklets).
2. Componente `Folha` (fundo, cantos, área segura, teclado): `Modal` com `animationType="fade"`
   (o fundo escurece no lugar) e a folha com `SlideInDown` de 250 ms; as 5 folhas passam a usá-lo.
3. `BarraDeProgresso` enchendo de 0 ao valor em 500 ms com `scaleX` (origem à esquerda), só ao
   aparecer; `accessibilityValue` com o número real desde o primeiro quadro.

## Entrega 3

1. Entrada em cascata (`FadeInDown` 200 ms, subida de 8, atraso de 40 ms por bloco, no máximo 6)
   no Início e nos cartões de Cartões, Contas e Dívidas; só na primeira carga. Início recarrega
   sem "carregando" depois de salvar numa folha.
2. Troca de mês com `FadeIn` de 150 ms no conteúdo de Transações e Relatório.
3. Esqueleto no Início (blocos `superficie` com pulso de opacidade 0,5 a 1 em 900 ms, parado com
   "reduzir movimento"), com a frase "Carregando o resumo..." continuando visível.
