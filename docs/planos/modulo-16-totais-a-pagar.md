# Plano do Módulo 16: totais na aba "A pagar"

Pedido do Vinicius em 2026-10-18: ver o total dos gastos fixos e o total das dívidas na própria
aba "A pagar", sem precisar ir ao Início. Decisões do Claude no modo autônomo.

## Decisões

1. **Só no app**, sem mudar o backend: a aba já recebe todos os números (valor e situação de cada
   fixo; `valor_total` e `valor_restante` de cada dívida). Somar no app é a versão mais simples.
2. A soma é feita em **centavos inteiros** (nova função `somarReais` em `src/formatacao.ts`),
   como a prévia das parcelas, para não errar centavos com número decimal do JavaScript.
3. **Gastos fixos**, embaixo do título da seção: "Falta pagar este mês: R$ Y (de R$ X por mês)".
   - X = soma dos fixos que já começaram (situação diferente de `nao_comecou`).
   - Y = soma dos fixos com situação `a_pagar`.
4. **Dívidas**, embaixo do título da seção: "Falta pagar: R$ Z (de R$ T)".
   - Z = soma dos `valor_restante`; T = soma dos `valor_total`.
5. Sem fixos (ou sem dívidas), a linha da seção não aparece (o vazio já explica).
6. Um total geral juntando as duas seções não entra: uma é por mês e a outra é o que falta de
   uma vez, e somar as duas confundiria.

## Casos de teste (Jest)

`formatacao-test.ts`:

1. `somarReais(['1200.00', '300.50'])` dá `'1500.50'`.
2. `somarReais([])` dá `'0.00'`.
3. `somarReais(['0.10', '0.20'])` dá `'0.30'` (o caso que erra com número decimal).

`dividas-test.tsx`:

4. Com dois fixos a pagar e um pago, aparece "Falta pagar este mês: R$ ... (de R$ ... por mês)"
   com os valores certos.
5. Fixo que ainda não começou não entra no "por mês".
6. Com duas dívidas, aparece "Falta pagar: R$ ... (de R$ ...)" com as somas certas.
7. Sem fixos e sem dívidas, nenhuma das duas linhas aparece.
