# Módulo 11: transferências entre contas próprias

Escrito em 2026-10-18. Pedido do Vinicius: transferência entre as próprias contas não é entrada
nem saída. Plano em
[`../../planos/modulo-11-transferencias-proprias.md`](../../planos/modulo-11-transferencias-proprias.md).
**Antes, estude** [`ajustes-do-mes.md`](ajustes-do-mes.md) (as regras com `Q`) e
[`categorias.md`](categorias.md) (a troca de categoria).

## 1. O problema e a solução

A Pluggy já marca como "Same person transfer" a maior parte das transferências com o nome do
Vinicius, e essas nunca contaram. Algumas escapam com outra categoria (ex.: PIX para "PICPAY
INSTITUICAO DE PAGAMENTO" marcado como "Services"). Adivinhar sozinho foi descartado (um teste
com os dados reais mostrou um falso positivo). A solução: a pessoa marca a transação, e as regras
passam a respeitar essa marca.

- **11a (backend):** as regras de entradas, saídas, gastos e guardado usam a **categoria
  efetiva**: a manual, se houver; senão a da Pluggy.
- **11b (app):** a folha "Categoria" tem, no topo, "Transferência entre minhas contas" ("Não
  conta como entrada nem saída."), que grava a categoria "Same person transfer".

## 2. Conceitos novos

- **`Coalesce(NullIf("categoria_manual", Value("")), "categoria_pluggy")`**, anotado no queryset
  como `categoria_efetiva` pela função `transacoes_do_periodo(inicio, fim)` em `resumo.py`. As
  regras (`TRANSFERENCIA_PROPRIA`, `PAGAMENTO_DE_FATURA`, `INVESTIMENTO` e combinações) comparam
  esse campo anotado. Usar uma regra num queryset sem a anotação dá `FieldError` (falha visível,
  não um número errado em silêncio).
- **Opção fixa fora do filtro**: na folha, a opção fica no `ListHeaderComponent` da `FlatList`;
  a busca filtra só os dados da lista, então a opção nunca some.

## 3. Arquivos

- `backend/financas/services/resumo.py` (categoria efetiva, `transacoes_do_periodo`) e
  `relatorio.py` (passa a usar a função).
- `mobile/src/componentes/FolhaDeCategoria.tsx` e `docs/design.md`.

## 4. Os testes

Backend (6 novos; 186 no total): saída marcada como transferência própria sai das saídas, dos
últimos gastos e dos gastos do relatório; entrada marcada sai das entradas; transferência da
Pluggy trocada para "Groceries" volta a contar (resumo e relatório); saída marcada como
"Investments" vira "guardado este mês".

App (5 novos; 139 no total, em `__tests__/transacoes-test.tsx`): a opção e a explicação
aparecem; tocar manda `{"categoria_manual": "Same person transfer"}`, fecha e relê; numa
transferência própria da Pluggy, a opção vem selecionada; a busca não a esconde.

## 5. Como usar

Na aba Transações, toque no PIX que é para você mesmo e escolha "Transferência entre minhas
contas". O Início, o relatório e o "posso gastar" passam a ignorá-lo.
