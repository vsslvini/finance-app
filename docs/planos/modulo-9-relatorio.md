# Plano do Módulo 9: relatório do mês (RF27)

Decidido pelo Claude em 2026-10-17, no modo autônomo. 9a é o backend; 9b é a tela (depois do 8b).

## O que os dados reais mostram (setembro e outubro de 2026)

- Na conta corrente, as saídas maiores são transferências: "Same person transfer" (entre contas
  próprias, já fica fora), "Transfer - PIX" e "Transfers" (PIX para outras pessoas, gasto de
  verdade) e também pagamentos de fatura que a Pluggy marcou como "Transfers"
  ("Pagamento de fatura", "Pagamento efetuado - Pagamento Fatura - ...").
- No cartão, as compras têm categorias úteis (Automotive, Digital services, Clothing...).

## Regra dos gastos do relatório

O RF27 pede que os gastos incluam as compras do cartão. Para não contar o mesmo dinheiro duas
vezes, o pagamento da fatura sai da conta:

- **Gastos** = saídas (valor negativo) da conta corrente **e** do cartão, no mês do app, menos:
  - o que já não conta no resumo (`NAO_E_GASTO`: transferência entre contas próprias,
    investimentos e a categoria "Credit card payment");
  - transações da conta corrente cuja descrição tem "fatura" (sem diferenciar maiúsculas), que
    são pagamentos de fatura marcados como "Transfers".
- **Entradas, saídas e saldo do mês** = os mesmos números do resumo (regra da conta corrente),
  para o relatório bater com a tela Início. Saldo do mês = entradas menos saídas.

Por isso o "total de gastos" do relatório pode ser diferente do "Saiu" do Início: o Início conta
o dinheiro que saiu da conta corrente (com a fatura paga), e o relatório conta o que foi consumido
(com as compras do cartão). A tela explica isso numa frase.

## 9a: backend (`python-backend-engineer`)

- `financas/services/relatorio.py`: `relatorio_do_mes(mes, hoje, dias_antes=0)`, reaproveitando
  o período e os números do resumo (sem copiar a regra; extrair uma função pequena no
  `resumo.py`, se precisar).
- `GET /api/relatorio/?mes=AAAA-MM` (com token; sem `mes`, o mês atual do app; mês inválido: 400
  com a mesma mensagem do resumo). Resposta:

```json
{
  "mes": "2026-10",
  "entradas": "3000.00",
  "saidas": "2500.00",
  "saldo_do_mes": "500.00",
  "total_gastos": "1800.00",
  "gastos_por_categoria": [
    {"categoria": "Transferências", "categoria_original": "Transfers", "total": "900.00", "porcentagem": 50}
  ],
  "maiores_gastos": [ /* até 5 transações, no formato do TransacaoSerializer (traduzidas) */ ]
}
```

  `gastos_por_categoria` em ordem do maior para o menor (empate: nome), agrupando pela categoria
  exibida (manual, senão Pluggy, senão "Sem categoria"), com o nome traduzido como na lista de
  transações; `porcentagem` = total da categoria / total de gastos, inteiro, arredondado para
  baixo (0 quando não há gastos). `total` sempre positivo. `maiores_gastos`: os 5 gastos de maior
  valor (em módulo), do maior para o menor.

Casos de teste (9a):

1. Entradas, saídas e saldo do mês iguais aos do resumo do mesmo mês (incluindo saldo negativo).
2. Gastos somam a corrente e o cartão; ficam de fora transferência entre contas próprias,
   investimentos, "Credit card payment", pagamento de fatura com "fatura" na descrição da
   corrente ("Pagamento de fatura", "Pagamento efetuado - Pagamento Fatura - X"), entradas e
   transações de outro mês.
3. "fatura" na descrição de uma compra **do cartão** não tira a compra (só vale na corrente).
4. Gastos por categoria: agrupados, do maior para o menor, com nome traduzido, categoria manual
   vencendo a da Pluggy, sem categoria como "Sem categoria", porcentagem para baixo.
5. Maiores gastos: os 5 maiores em módulo, do maior para o menor, no formato da lista de
   transações.
6. O mês segue o mês do app (dias antes) e o `?mes=`; mês inválido dá 400 com a mensagem; sem
   gastos, listas vazias, total "0.00" e porcentagens sem divisão por zero.
7. A rota exige token (401).

## 9b: tela (depois do 8b)

Botão secundário "Ver relatório do mês" na tela Início (depois de Entrou e Saiu), que abre a
tela `/relatorio` por cima das abas (na pilha da raiz), com voltar, setas de mês como em
Transações, os números do mês, as categorias com barra de porcentagem e os maiores gastos.
Contrato e casos definidos junto com o 9b.
