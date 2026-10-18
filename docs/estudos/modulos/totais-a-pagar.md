# Módulo 16: totais na aba "A pagar"

Escrito em 2026-10-18. Pedido do Vinicius: ver o total dos gastos fixos e das dívidas na própria
aba "A pagar", sem ir ao Início. Plano em
[`../../planos/modulo-16-totais-a-pagar.md`](../../planos/modulo-16-totais-a-pagar.md).
**Antes, estude** [`editar-divida.md`](editar-divida.md) e
[`gasto-previsto-e-fixos.md`](gasto-previsto-e-fixos.md).

## 1. O que o módulo entrega

- Embaixo de "Gastos fixos": "Falta pagar este mês: R$ 1.299,90 (de R$ 1.600,40 por mês)".
  O "por mês" soma os fixos que já começaram; o "falta" soma só os que estão "A pagar" (os pagos,
  à mão ou achados nas transações, ficam fora).
- Embaixo de "Dívidas": "Falta pagar: R$ 1.166,67 (de R$ 1.500,00)". Soma o que falta de cada
  dívida e o valor total delas.
- Sem fixos (ou sem dívidas), a linha não aparece; o aviso de vazio já explica.
- Não há total geral: os fixos são por mês e as dívidas são o que falta de uma vez; somar os dois
  daria um número sem sentido.

## 2. Por que só no app

A aba já recebe tudo de que precisa (`GET /api/gastos-fixos/` traz o valor e a situação do mês;
`GET /api/dividas/` traz `valor_total` e `valor_restante`). Somar no app evita uma rota nova e
um teste a mais no backend. Regra prática: se o número sai de uma conta simples com dados que a
tela já tem, calcule na tela; se depende de regra de negócio (como o "posso gastar"), fica no
backend.

## 3. O fluxo

1. A aba carrega as duas listas (`useCarga(buscarAPagar)`).
2. Na renderização, `src/app/(abas)/dividas.tsx` filtra os fixos (`nao_comecou` fora,
   `a_pagar` para o "falta") e chama `somarReais` com os valores.
3. `formatarReais` transforma o resultado em "R$ 1.299,90", e a frase vai num `<Text>` só.
4. Nada é guardado em estado: quando a lista é relida (marcar pago, salvar, puxar para baixo), a
   tela redesenha e as somas saem certas sozinhas.

## 4. `somarReais` e os centavos

Em JavaScript, `0.1 + 0.2` dá `0.30000000000000004`, porque o número decimal é guardado em
binário e alguns valores não cabem exatos. Com dinheiro, isso vira centavo errado. A função
`somarReais` (`src/formatacao.ts`) separa "300.50" em reais e centavos, transforma em 30050
centavos (número inteiro, sempre exato), soma os inteiros e só no fim volta para "1500.50". É a
mesma ideia da prévia das parcelas no cadastro de dívida.

## 5. Os testes

`__tests__/formatacao-test.ts` (função pura, sem tela):

1. `['1200.00', '300.50']` dá `'1500.50'`: a soma comum.
2. `[]` dá `'0.00'`: lista vazia não quebra e não vira `NaN`.
3. `['0.10', '0.20']` dá `'0.30'`: o caso que erraria com número decimal.

`__tests__/dividas-test.tsx` (a tela com o servidor falso):

4. Dois fixos a pagar e um pago: "falta" só com os a pagar, "por mês" com os três.
5. Um fixo que não começou fica fora do "por mês" (sem a regra, daria R$ 1.379,90).
6. Duas dívidas: somas do restante e do total.
7. Sem fixos e sem dívidas, nenhuma das duas frases aparece. Este teste já passava antes do
   código existir: serve de proteção para o futuro, não para ver o vermelho.

## 6. Para testar à mão

No celular, aba "A pagar": confira as duas linhas; marque um fixo como pago e veja o "falta"
diminuir; marque uma parcela de dívida como paga e feche a folha.
