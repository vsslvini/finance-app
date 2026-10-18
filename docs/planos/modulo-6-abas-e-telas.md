# Plano do Módulo 6: abas e telas Transações, Cartões e Contas

Proposta do `mobile-ui-expert` em 2026-10-17; decisões tomadas pelo Claude no modo autônomo
(o Vinicius delegou as decisões não críticas). Atende RF01 a RF03, RF05 a RF07, RF11, RF12 e
parte do RF14. Sem backend novo e sem dependência nova. RF13 (faturas futuras) fica para o
Módulo 7.

## Decisões

1. O mês inicial das Transações vem do `GET /api/resumo/` (campo `mes`), para não copiar no app
   a regra do mês começando dias antes (RF30).
2. Puxar para baixo nas abas novas só relê a rota da tela (sem sincronizar com a Pluggy; isso
   continua só no Início).
3. Parcelas com data futura no mês atual aparecem (a data deixa claro).
4. Contas não repete o total; a visão geral somada é o "Saldo" do Início (RF03).
5. Pagamentos de fatura e transferências entre contas próprias aparecem como vieram do banco
   (a tela não tem totais, então nenhum número fica errado).
6. A segunda conta corrente do Inter aparece como veio.
7. Ícones: Início `house`, Transações `arrow-left-right`, Cartões `credit-card`, Contas
   `landmark`; setas `chevron-left` e `chevron-right` (todos conferidos no glyphmap).
8. "Próximo mês" fica desativado no mês atual (meses futuros são o RF13).

## Estrutura

```
mobile/src/app/
  _layout.tsx        continua (fontes, StatusBar, Stack); a Stack passa a ter só o grupo
  (abas)/
    _layout.tsx      Tabs de 'expo-router/js-tabs' (o Tabs de 'expo-router' está obsoleto no 57)
    index.tsx        a tela Início, movida de app/index.tsx sem mudar o conteúdo
    transacoes.tsx
    cartoes.tsx
    contas.tsx
```

Opções das abas (seção "Abas" do `docs/design.md`): `headerShown: false`; barra em
`superficie` com divisória de 1 em `borda` no topo, altura 64 + `insets.bottom`
(`useSafeAreaInsets`); ativa em `acento`, inativa em `textoSecundario`; ícone 24; rótulo no
estilo `rotulo`; `sceneStyle` com fundo `fundo`; `lazy` padrão.

Estados iguais em todas as telas novas (como o Início): carregando (indicador `acento` + texto),
erro (`MENSAGENS_DE_ERRO[tipo]` + botão secundário "Tentar de novo", sem botão no erro de token),
vazio (texto `textoSecundario` centralizado). Puxar para baixo: `RefreshControl` igual ao do
Início, relê sem voltar para "Carregando"; se falhar, os dados ficam e aparece
"Não foi possível atualizar agora.". O `ScrollView`/`FlatList` de cada tela tem testID
`rolagem-transacoes`, `rolagem-cartoes` e `rolagem-contas`.

## Nomes no código

- `src/api.ts`: tipo `Conta` (campos do `ContaSerializer`: `id`, `nome`, `nome_banco`,
  `tipo` (`"corrente"` ou `"cartao"`), `saldo`, `limite_total`, `limite_disponivel`,
  `data_fechamento`, `data_vencimento`; os quatro últimos `string | null`); tipo `Transacao`
  (os campos do `GastoResumo`; pode ser `export type Transacao = GastoResumo`);
  `buscarContas(): Promise<Conta[]>` (`GET /api/contas/`) e
  `buscarTransacoes(mes: string): Promise<Transacao[]>` (`GET /api/transacoes/?mes=AAAA-MM`).
- `src/formatacao.ts`: `mesVizinho(mes: string, passo: number): string` ("2026-10", -1 ->
  "2026-09"; "2026-01", -1 -> "2025-12"; "2026-12", 1 -> "2027-01"), só com texto.

## Telas

### Transações

- Cabeçalho fixo: botão "Mês anterior" (`chevron-left`, 44x44), título do mês (`titulo`,
  `accessibilityRole="header"`, `tituloDoMes`) e botão "Próximo mês" (`chevron-right`;
  desativado no mês do resumo: cor `textoTerciario`, `accessibilityState={{ disabled: true }}`,
  sem pedido ao tocar).
- Lista (`FlatList`) num cartão `superficie` com divisórias, na ordem da API. Cada item: ícone
  de categoria (`iconeDaCategoria`), descrição (`corpo`), linha `detalhe`
  "08/10 · Nubank · Mastercard Black", linha `detalhe` com a categoria e, se houver parcela,
  " · Parcela 3 de 10"; valor à direita: saída "- R$ 45,90" em `negativo`, entrada
  "+ R$ 3.000,00" em `positivo`.
- Rótulo de acessibilidade do item: "iFood, saída de 45,90 reais, 08/10, Nubank Mastercard
  Black, categoria Food delivery" (entrada: "entrada de"; parcela: acrescenta
  ", parcela 3 de 10").
- Ao trocar de mês, só a área da lista mostra carregando, erro ou vazio; o cabeçalho fica. Só a
  resposta do último mês pedido entra na tela.
- Se o resumo inicial falhar, erro de tela inteira com "Tentar de novo" (refaz tudo).
- Textos: "Carregando as transações...", "Nenhuma transação em Setembro de 2026.",
  "Não foi possível atualizar agora.".

### Cartões

- Título "Cartões" (`titulo`, header). Um cartão `superficie` por conta com `tipo === "cartao"`,
  na ordem da API: banco (`subtitulo`), nome do cartão (`detalhe`), `RotuloDoCartao`
  "Fatura aberta" (ícone `credit-card`) e o valor (`valor`, `formatarReais`), limite (`corpo`)
  "Limite disponível: R$ 4.154,90 de R$ 5.000,00" ou "Limite não informado" (se algum dos dois
  for null), datas (`detalhe`): "Vence em 05/11", "Fecha em 28/10 · Vence em 05/11", "Fecha em
  28/10" ou nada.
- Cada cartão é um bloco acessível: "Nubank, Mastercard Black. Fatura aberta: 845,10 reais.
  Limite disponível: 4.154,90 de 5.000,00 reais. Vence em 05/11."
- Textos: "Carregando os cartões...", "Nenhum cartão encontrado.".

### Contas

- Título "Contas" (`titulo`, header). Um grupo por banco (contas seguidas com o mesmo
  `nome_banco`, a API já ordena): nome do banco (`subtitulo`, header) e um cartão `superficie`
  com as linhas: ícone 16 `textoSecundario` (`wallet` corrente, `credit-card` cartão), nome
  (`corpo`), embaixo "Saldo" ou "Fatura aberta" (`detalhe`), valor à direita (`valor`, cor
  `texto`; negativo "- R$ 50,00" em `negativo`).
- Rótulo de cada linha: "Inter, Conta Corrente, saldo: 1.234,56 reais" /
  "Inter, Inter Gold, fatura aberta: 320,00 reais".
- Textos: "Carregando as contas...", "Nenhuma conta encontrada.".

## Casos de teste

Abas (`__tests__/rotas-test.tsx`, fetch que nunca responde):

1. A barra mostra "Início", "Transações", "Cartões" e "Contas", nessa ordem.
2. Ao abrir, o endereço é "/" e aparece "Carregando o resumo...".
3. Tocar em "Transações" leva a "/transacoes" e mostra "Carregando as transações...".
4. Tocar em "Cartões" leva a "/cartoes" e mostra "Carregando os cartões...".
5. Tocar em "Contas" leva a "/contas" e mostra "Carregando as contas...".

Transações (dados: resumo `mes` "2026-10"; iFood -45.90 08/10 Nubank Mastercard Black Food
delivery; Salário 3000.00 05/10 Inter Conta Corrente Salary; Loja X -120.00 parcela 3 de 10
Shopping):

1. Enquanto a API não responde, "Carregando as transações...".
2. Pede `GET /api/transacoes/?mes=2026-10` e mostra "Outubro de 2026".
3. A saída mostra "iFood", "- R$ 45,90", "08/10 · Nubank · Mastercard Black" e
   "Food delivery"; a parcelada mostra "Shopping · Parcela 3 de 10".
4. A entrada mostra "+ R$ 3.000,00" e o rótulo "Salário, entrada de 3.000,00 reais, 05/10,
   Inter Conta Corrente, categoria Salary".
5. "Mês anterior" pede `?mes=2026-09` e mostra "Setembro de 2026"; vazia, "Nenhuma transação
   em Setembro de 2026.".
6. Em outubro, "Próximo mês" está desativado e não faz pedido; em setembro, pede
   `?mes=2026-10`.
7. Erro de conexão na lista: mensagem de conexão e "Tentar de novo"; título e setas ficam;
   tocar refaz o mesmo mês e mostra a lista.
8. Puxar para baixo relê o mesmo mês sem "Carregando as transações..."; se falhar, a lista
   fica e aparece "Não foi possível atualizar agora.".
9. Unitários de `mesVizinho` (os três exemplos acima).

Cartões (dados: Nubank Conta Corrente; Nubank Mastercard Black saldo 845.10, limite 5000.00,
disponível 4154.90, vencimento 2026-11-05, fechamento null; Inter Gold com limites null):

1. "Carregando os cartões..." enquanto espera.
2. Só cartões: "Mastercard Black" aparece, "Conta Corrente" não.
3. "Fatura aberta", "R$ 845,10" e "Limite disponível: R$ 4.154,90 de R$ 5.000,00".
4. "Vence em 05/11" sem "Fecha em"; com fechamento 2026-10-28, "Fecha em 28/10 · Vence em
   05/11".
5. Limites null: "Limite não informado".
6. Só contas correntes: "Nenhum cartão encontrado.".
7. Erro 500: mensagem do servidor e "Tentar de novo", que busca de novo e mostra os cartões.
8. Puxar para baixo mostra o valor novo sem "Carregando os cartões..."; se falhar, os dados
   ficam e aparece "Não foi possível atualizar agora.".

Contas (dados: Inter Conta Corrente 1234.56; Inter Gold cartão 320.00; Nubank Conta Corrente
-50.00):

1. "Carregando as contas..." enquanto espera.
2. Grupos "Inter" e "Nubank", nessa ordem, com "Inter Gold" entre os dois.
3. "Conta Corrente", "Saldo" e "R$ 1.234,56".
4. "Inter Gold", "Fatura aberta" e "R$ 320,00".
5. Saldo negativo "- R$ 50,00".
6. Lista vazia: "Nenhuma conta encontrada.".
7. Erro 401: mensagem do token, sem "Tentar de novo".
8. Puxar para baixo mostra o valor novo sem "Carregando as contas...".

## Para depois

RF13 (Módulo 7), RF08 (trocar categoria), RF09 (filtros, precisa de backend), RF10 (gasto
manual), categorias em português, lista agrupada por dia, barra de limite usado, total em
Contas, recarregar ao voltar para a aba (`useFocusEffect`), compras da fatura, "Ver todas" nos
Últimos gastos, meses futuros, sincronizar puxando em qualquer aba.
