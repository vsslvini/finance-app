# Plano do Módulo 15: editar dívida

Pedido do Vinicius em 2026-10-18: hoje a dívida não pode ser editada; quando erra algo, precisa
apagar e cadastrar de novo. Quer como nos gastos fixos: tocar no cartão e editar as informações.
Decisões do Claude no modo autônomo. 15a é o backend; 15b é o app.

## O que já existe

- `PATCH /api/dividas/<id>/` já existe, mas só muda "para quem" e o motivo (decisão 4 do
  Módulo 12); o valor mandado junto é ignorado.
- O cartão da dívida abre a `FolhaDaDivida` (lista de parcelas, marcar paga, apagar).
- O gasto fixo usa uma folha só para cadastrar e editar (`FolhaDoGastoFixo`, com `gasto?`).

## Decisões

1. A edição muda **todos** os campos do cadastro: para quem, motivo, valor total, parcelas e mês
   da primeira parcela.
2. Mudou valor total, parcelas ou mês da primeira: as parcelas são **geradas de novo** (apaga as
   antigas e cria as novas, com a mesma regra do cadastro), tudo num `transaction.atomic`.
   Mudou só para quem ou motivo: as parcelas ficam como estão.
3. **Com alguma parcela paga**, valor, parcelas e mês ficam travados: o backend responde 400
   ("Com parcela paga, só dá para mudar para quem e o motivo.") e o app nem mostra esses campos
   como editáveis (mostra um aviso). Por quê: gerar de novo mudaria o valor de uma parcela que
   já saiu da conta, e o "pago" e o "falta" deixariam de bater com o dinheiro de verdade. Para
   corrigir, a pessoa desmarca as pagas, edita e marca de novo. Mandar o mesmo valor que já
   está (o app manda o formulário inteiro) não conta como mudança.
4. A resposta da dívida passa a trazer `mes_inicio` ("AAAA-MM"), para o app preencher o campo.
5. No app, a `FolhaDeNovaDivida` vira `FolhaDoCadastroDeDivida` (com `divida?`, como a
   `FolhaDoGastoFixo`): sem dívida cadastra; com dívida edita, com os campos preenchidos. A
   `FolhaDaDivida` ganha o botão **"Editar dívida"** ao lado do "Fechar", e o "Apagar dívida"
   desce para baixo (como no gasto fixo). Tocar no cartão continua abrindo as parcelas, que é o
   uso do dia a dia; editar é um toque a mais.

Versão mais simples descartada: editar só para quem e motivo no app (o backend já aceita), mas o
erro mais comum é no valor ou nas parcelas, que é justamente o que o Vinicius quer corrigir.

## 15a: backend (`python-backend-engineer`)

- `services/dividas.py`: `editar_divida(divida, **dados)` atômica; regera as parcelas quando
  valor, parcelas ou mês mudam; erro de regra quando há parcela paga.
- `serializers.py`: `EditarDividaSerializer` aceita os cinco campos (todos opcionais, mesmas
  validações do cadastro); `DividaSerializer` ganha `mes_inicio`.
- `views.py`: o PATCH usa o service e devolve 400 com a mensagem da decisão 3.

Casos de teste (pytest):

1. PATCH com credor e motivo muda os dois e mantém as parcelas (mesmos ids).
2. PATCH com valor total e parcelas novos (sem parcela paga) gera as parcelas de novo: 1200 em 4x
   dá 4 parcelas de 300, e o `valor_total` e o `total_parcelas` mudam.
3. PATCH com mês da primeira novo regera os meses das parcelas.
4. PATCH com valor diferente e uma parcela paga responde 400 com a mensagem, e nada muda.
5. PATCH com uma parcela paga mandando o formulário inteiro com os mesmos valor, parcelas e mês
   e um credor novo aceita e muda só o credor (a parcela continua paga).
6. PATCH com dados inválidos (valor zero, 0 ou 121 parcelas, mês "13/2026", credor vazio)
   responde 400 com a mesma mensagem do cadastro, e nada muda.
7. A resposta (GET e PATCH) traz `mes_inicio` como "AAAA-MM".
8. O teste antigo "valor mandado junto é ignorado" muda: agora o valor é aceito (caso 2).

## 15b: app (`react-native-expert` e `mobile-tester`)

- `api.ts`: `Divida` ganha `mes_inicio`; `editarDivida(id, dados)` (PATCH, mesmo formato do
  `NovaDivida`).
- `FolhaDoCadastroDeDivida` (renomeia a `FolhaDeNovaDivida`), com `divida?`.
- `FolhaDaDivida`: botão "Editar dívida"; a aba abre a folha de cadastro com a dívida e, ao
  salvar, fecha as duas folhas e relê a lista.

Casos de teste (Jest):

1. Na folha da dívida, "Editar dívida" abre a folha com título "Editar dívida" e os campos
   preenchidos (para quem, motivo, valor "1.000,00", parcelas "3", mês "11/2026").
2. Mudar o valor e salvar chama `editarDivida` com o id e os dados novos, fecha a folha e relê a
   lista.
3. Com uma parcela paga, os campos valor, parcelas e mês não aparecem para editar e aparece o
   aviso; salvar manda só para quem e motivo.
4. Erro da API ao editar mantém a folha aberta com a mensagem.
5. Cadastro novo continua igual (os testes atuais da nova dívida passam com a folha renomeada).
