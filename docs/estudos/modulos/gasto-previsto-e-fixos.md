# Módulo 14: gasto previsto e gastos fixos

Escrito em 2026-10-18. Pedido do Vinicius depois de testar no celular: o "Gasto previsto"
("talvez o mais importante de todos") e os gastos fixos (apartamento, condução, internet)
cadastrados uma vez. Atende RF32 e RF33. Plano em
[`../../planos/modulo-14-gasto-previsto-e-fixos.md`](../../planos/modulo-14-gasto-previsto-e-fixos.md).
**Antes, estude** [`dividas.md`](dividas.md) (a mesma ideia de "conta até ser pago") e
[`embelezamento.md`](embelezamento.md).

## 1. O que o módulo entrega

- **Gastos fixos** (aba "A pagar", que antes se chamava "Dívidas"): nome, valor por mês, dia do
  vencimento, mês de início e um trecho opcional da descrição (ex.: "DIRECIONAL"). Cada mês o
  fixo está "Pago (achado nas transações)" (o app achou uma saída com o trecho), "Pago" (marcado à
  mão) ou "A pagar". A pagar, conta nas saídas do mês e sai do "posso gastar"; pago, não conta (o
  pagamento real já está nas transações).
- **Gasto previsto** (Início, logo depois da régua): "Falta pagar em outubro" (fixos a pagar,
  dívidas do mês, atrasadas e faturas que vencem neste mês) e "Previsto para novembro" (todos os
  fixos, dívidas do mês que vem e a fatura aberta dos cartões), cada um com o detalhe.
- O Início relê o resumo quando a aba ganha foco: marcar um fixo como pago em "A pagar" já muda o
  previsto ao voltar.
- Backend 268 testes (51 novos); app 220 (38 novos).

Com os dados reais de 2026-10-18 (sem fixos cadastrados ainda): previsto para novembro
R$ 943,71, das três faturas abertas (Inter R$ 130,39, Nubank R$ 358,32, PicPay R$ 455,00).

## 2. Decisões importantes

- **Pago automático pelo trecho**: os fixos reais são PIX para os mesmos destinatários todo mês
  ("DIRECIONAL ENGENHAR", "CEU AZUL EMPREENDIM", "CAKTO PAY"). Basta cadastrar o trecho, e o app
  marca o mês como pago sozinho quando o PIX aparece. O trecho precisa de pelo menos 3 letras
  (um trecho curto casaria com quase tudo).
- **Em que mês a fatura vence**: a data de vencimento que a Pluggy manda está velha (5 de
  outubro). Regra: vencimento hoje ou depois vale o mês dessa data; no passado ou vazio, a fatura
  aberta vence no mês que vem. Limite: entre o fechamento e o vencimento, se a Pluggy não
  atualizar a data, a fatura cai no mês errado.

## 3. Conceitos novos

- **Função pura para a regra do trecho** (`situacao_do_fixo`) e para o mês da fatura
  (`mes_da_fatura`): testadas sem banco.
- **`UniqueConstraint`**: um pagamento por fixo e por mês; marcar duas vezes não duplica
  (`get_or_create`), e o `PUT` é **idempotente** (repetir dá o mesmo resultado).
- **`useFocusEffect`** (expo-router): roda quando a tela ganha foco. Nos testes que desenham a
  tela sozinha (sem navegador), ele é trocado por um dublê que não faz nada; o teste de rotas, com
  o navegador de verdade, confere a releitura. Um teste vermelho mostrou que a aba Transações
  também pede o resumo, e a contagem do teste foi ajustada (o código estava certo).
- **Validação de data sem fuso**: o lint (`DTZ007`) recusou `datetime.strptime` sem fuso; o mês
  passou a ser montado com `date(ano, mes, 1)`, como no `ler_mes` do resumo.

## 4. Arquivos

- Backend: `planejamento/models.py` (`GastoFixo`, `PagamentoDeGastoFixo`), migration `0004`,
  `services/gastos_fixos.py`, `services/previsto.py`, serializers, views, urls, admin;
  `financas/services/resumo.py` e `relatorio.py` (categoria "Gastos fixos"), `financas/views.py`.
- App: `src/api.ts`, `src/componentes/CartaoDoPrevisto.tsx`, `LinhaDeGastoFixo.tsx`,
  `FolhaDoGastoFixo.tsx`, `src/app/(abas)/index.tsx`, `dividas.tsx` (aba "A pagar"),
  `_layout.tsx`, `docs/design.md`.

## 5. Como usar

Aba "A pagar", "Novo gasto fixo": "Apartamento", o valor, o dia e o trecho "DIRECIONAL". Faça o
mesmo para "CEU AZUL" e "CAKTO PAY". Volte ao Início: o "Gasto previsto" mostra o que falta pagar
neste mês e o previsto do mês que vem.
