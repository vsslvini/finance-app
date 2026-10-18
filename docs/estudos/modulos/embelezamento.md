# Módulo 13: embelezamento (movimento e refinamento visual)

Escrito em 2026-10-18. Pedido do Vinicius: refinar o visual com animações que combinem com o
design e virem regra. Plano em
[`../../planos/modulo-13-embelezamento.md`](../../planos/modulo-13-embelezamento.md); as regras
estão na seção "10. Movimento" do [`../../design.md`](../../design.md). **Antes, estude**
[`abas-e-telas.md`](abas-e-telas.md) e [`dividas.md`](dividas.md) (as telas animadas).

## 1. Por que não a hairline

A biblioteca sugerida (hairline) desenha figuras de traço fino em elementos de página web (DOM);
o app é React Native, que não tem DOM. O equivalente no app é a `react-native-reanimated`
(animação, já instalada) e os ícones Lucide de traço fino (nos estados vazios). Ilustrações com
`react-native-svg` ficaram de fora: seriam dependência nova para telas que quase não aparecem.

## 2. O que entrou, em três entregas

1. **Sem animação**: toque unificado (`toque.apertado`: opacidade 0,85 e escala 0,98 em cartões
   e botões; `toque.apertadoIcone`: opacidade 0,7 em linhas e ícones) e `EstadoVazio` (ícone de
   40 acima da frase nos 6 estados vazios).
2. **Reanimated entra**: configuração no Jest (`testes/configurar-reanimated.ts` com
   `setUpTests()` e o resolver do Worklets no `package.json`, mais um teste de fumaça); a `Folha`
   (base das 5 folhas: o fundo escurecido esmaece no lugar e a folha sobe com `SlideInDown` em
   250 ms); a `BarraDeProgresso` enchendo de 0 ao valor em 500 ms com `scaleX`.
3. **Entrada e carregamento**: blocos do Início e cartões das abas entram em cascata
   (`FadeInDown` de 200 ms, 40 ms entre um e outro, no máximo 6); o conteúdo do mês esmaece ao
   trocar de mês (150 ms); o Início mostra um esqueleto que pulsa enquanto carrega. Depois de
   salvar numa folha, o Início relê sem voltar para "carregando" (a cascata não repete).

## 3. Conceitos novos

- **`useSharedValue`**: um valor que a animação muda sem fazer o React desenhar de novo a cada
  quadro. **`useAnimatedStyle`** transforma esse valor em estilo.
- **`withTiming(valor, { duration, easing })`**: vai até o valor no tempo dado, com a curva dada
  (`Easing.out(Easing.cubic)`: rápido no começo, suave no fim). **`withRepeat(..., -1, true)`**:
  repete para sempre, indo e voltando.
- **Animações de entrada** (`entering={FadeInDown...}` num `Animated.View`): rodam quando o
  componente aparece. Por isso puxar para baixo não repete a cascata: os blocos não saem da tela.
- **Reduzir movimento**: no Reanimated 4, `withTiming` e as animações de entrada seguem a opção do
  celular por padrão (`ReduceMotion.System`) e pulam direto ao fim.
- **Valores em dinheiro não animam**: o "posso gastar" precisa aparecer certo na hora.
- **Testes e animação**: animação não é testada no Jest; o que se confere é que o conteúdo
  continua na tela e acessível. A versão simulada do Reanimated (usada indiretamente pelo teste de
  rotas) não tem o `useReducedMotion`; por isso o esqueleto confia no padrão do `withTiming`. Foi
  um teste vermelho que mostrou isso.

## 4. Arquivos

`src/tema.ts` (`toque`), `src/movimento.ts` (`entradaEmCascata`, `ENTRADA_DO_CONTEUDO`),
`src/componentes/` (`EstadoVazio`, `Folha`, `BarraDeProgresso`, `EsqueletoDoInicio` e as 5
folhas), as telas das abas e o relatório, `package.json` (Jest) e `testes/configurar-reanimated.ts`.

## 5. Testar à mão

No Expo Go: abra o app (esqueleto e cascata no Início), toque num cartão (afunda de leve), abra
uma folha (o fundo escurece no lugar e a folha sobe), veja as barras do Guardado e do relatório
encherem, troque de mês em Transações. Com "Remover animações" ligado no celular, nada se mexe.

## 6. Pendências

- Divisórias com `StyleSheet.hairlineWidth` (a linha mais fina da tela): decidir vendo no celular.
- Animação ao fechar a folha (hoje some de uma vez).
