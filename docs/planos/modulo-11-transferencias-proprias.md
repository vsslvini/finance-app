# Plano do Módulo 11: transferências entre contas próprias

Pedido do Vinicius em 2026-10-17: transferências entre as próprias contas não podem contar como
entrada nem saída (é só dinheiro mudando de lugar). Decisões do Claude no modo autônomo.

## O que os dados reais mostram

- A maior parte já está certa: os PIX entre Nubank e Inter com o nome do Vinicius chegam como
  "Same person transfer" e já ficam fora de entradas, saídas e gastos (`TRANSFERENCIA_PROPRIA`).
- O que escapa são transferências que a Pluggy marca com outra categoria, ex.: "Transferência
  enviada pelo Pix|PICPAY INSTITUICAO DE PAGAMENTO S/A" chegou como "Services" e como
  "Transfers".
- Casar automaticamente "saída numa conta + entrada do mesmo valor em outra conta minha no mesmo
  dia" foi descartado: nos dados há um falso positivo (R$ 20 para uma pessoa no Nubank e R$ 20
  recebidos da mesma pessoa no Inter, no mesmo dia).

## Decisões

1. As regras do resumo, do relatório e do guardado passam a usar a **categoria efetiva**: a
   categoria manual, se houver; senão a da Pluggy. Assim, marcar uma transação como
   transferência própria (ou como investimento) muda as contas. Hoje elas olham só
   `categoria_pluggy`.
2. A folha "Categoria" (aba Transações) ganha uma opção fixa no topo, "Transferência entre
   minhas contas", com a explicação "Não conta como entrada nem saída.", que manda
   `{"categoria_manual": "Same person transfer"}` (categoria que existe na tabela da Pluggy:
   "Transferência mesma titularidade"). Ela fica marcada quando a categoria original da
   transação começa com "Same person transfer".
3. O contrário também vale: se a Pluggy marcou como transferência própria algo que não é, trocar
   para outra categoria faz a transação voltar a contar.

## 11a: backend (`python-backend-engineer`)

- `financas/services/resumo.py`: as regras (`TRANSFERENCIA_PROPRIA`, `PAGAMENTO_DE_FATURA`,
  `INVESTIMENTO` e as combinações) passam a comparar a categoria efetiva. Jeito sugerido: uma
  função que anota `categoria_efetiva = Coalesce(NullIf("categoria_manual", ""),
  "categoria_pluggy")` no queryset e regras `Q(categoria_efetiva...)`; o resumo, o relatório e o
  guardado anotam antes de filtrar. Um lugar só para a regra.
- Comportamento sem categoria manual: idêntico ao de hoje (todos os testes atuais passam).

Casos de teste (11a):

1. Uma saída "Transfers" com categoria manual "Same person transfer" sai das saídas do resumo,
   dos gastos do relatório e do "posso gastar" não muda por causa dela.
2. Uma entrada com categoria manual "Same person transfer" sai das entradas do resumo.
3. Uma transação que a Pluggy marcou "Same person transfer - PIX" e o Vinicius trocou para
   "Groceries" volta a contar como saída e como gasto.
4. Categoria manual "Investments" numa saída da corrente: sai das saídas e entra no "guardado
   este mês".
5. Sem categoria manual, nada muda (os testes atuais cobrem).

## 11b: app (`react-native-expert` e `mobile-tester`)

- `FolhaDeCategoria`: logo depois do campo de busca e antes de "Usar a categoria do banco", a
  opção "Transferência entre minhas contas" (botão; nome acessível exatamente esse texto; embaixo,
  em `detalhe`, "Não conta como entrada nem saída."), que manda `"Same person transfer"`.
  Selecionada (`accessibilityState={{ selected: true }}` e ícone `check`) quando
  `categoria_original` começa com "Same person transfer". A busca não esconde essa opção.
- Não aparece duas vezes: se a lista de `GET /api/categorias/` trouxer itens que começam com
  "Same person transfer", eles continuam na lista normal (a opção do topo é um atalho).

Casos de teste (11b):

1. A folha mostra "Transferência entre minhas contas" e "Não conta como entrada nem saída.".
2. Tocar manda `PATCH` com `{"categoria_manual": "Same person transfer"}`, fecha a folha e relê.
3. Numa transação com `categoria_original` "Same person transfer - PIX", a opção vem selecionada.
4. Buscar "merc" não esconde a opção do topo.
