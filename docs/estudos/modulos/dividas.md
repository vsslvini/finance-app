# Módulo 12: dívidas

Escrito em 2026-10-18. Atende RF21, com o pedido do Vinicius de 2026-10-17. Plano em
[`../../planos/modulo-12-dividas.md`](../../planos/modulo-12-dividas.md). **Antes, estude**
[`guardado-backend.md`](guardado-backend.md) (plano de guardar descontado do "posso gastar") e
[`relatorio.md`](relatorio.md).

## 1. O que o módulo entrega (12a, backend)

- Tabelas `Divida` (para quem, motivo, valor total, total de parcelas, mês da primeira parcela) e
  `ParcelaDaDivida` (número, mês, valor, paga, paga em), no app `planejamento`.
- Rotas: `GET`/`POST /api/dividas/`, `PATCH`/`DELETE /api/dividas/<id>/` e
  `PATCH /api/parcelas/<id>/` (marcar ou desmarcar como paga).
- Resumo: `dividas_do_mes` (não pagas do mês, já dentro de `saidas`) e `dividas_atrasadas` (não
  pagas de meses anteriores); as duas são descontadas do "posso gastar".
- Relatório: as não pagas do mês viram a categoria "Dívidas" nos gastos.
- 31 testes novos; o backend tem 217.

## 2. A regra para não contar duas vezes

Uma parcela **não paga** é dinheiro comprometido: conta como saída no mês dela. Quando a pessoa
paga de verdade, o PIX aparece nas transações e já conta como saída; por isso a parcela é marcada
como **paga** e deixa de contar. Parcelas atrasadas não entram nas saídas do mês atual (eram do
mês delas), mas saem do "posso gastar", porque o dinheiro continua devido. Cada parcela da API
traz `atrasada` (não paga e de mês anterior ao mês atual do app), para o app não precisar copiar
a regra dos dias antes.

## 3. Conceitos novos

- **Gerar parcelas sem perder centavo**: valor ÷ parcelas arredondado para baixo no centavo, e a
  última leva a sobra (1.000 em 3x = 333,33 + 333,33 + 333,34). Função pura `gerar_parcelas`.
- **`transaction.atomic` + `bulk_create`**: `criar_divida` grava a dívida e todas as parcelas
  numa transação só (ou tudo, ou nada) e num único `INSERT` para as parcelas.
- **`@property` no model**: `valor_pago`, `valor_restante` e `proxima_parcela` são calculados a
  partir das parcelas, sem coluna no banco.
- **`on_delete=CASCADE`**: apagar a dívida apaga as parcelas (diferente do `PROTECT` das contas,
  aqui as parcelas não fazem sentido sozinhas).
- **Nome do campo**: no model é `total_parcelas`, porque `parcelas` é o nome da ligação com as
  parcelas (`related_name`); na entrada do `POST` continua `parcelas`.

## 4. Arquivos

- `planejamento/models.py`, `migrations/0003_divida_parceladadivida.py`, `admin.py` (sem
  "adicionar", porque uma dívida criada no admin ficaria sem parcelas).
- `planejamento/services/dividas.py`: `somar_meses`, `gerar_parcelas`, `criar_divida`,
  `total_do_mes`, `total_atrasadas`.
- `planejamento/serializers.py`, `views.py`, `urls.py`.
- `financas/services/resumo.py` e `relatorio.py` (recebem os totais como parâmetros) e
  `financas/views.py` (lê os totais e passa adiante, como o plano de guardar).

## 5. Os testes (12a)

`planejamento/tests/test_dividas.py` e `test_api_dividas.py`, mais acréscimos em `test_resumo.py`,
`test_api_resumo.py`, `test_relatorio.py` e `test_api_relatorio.py`: gerar parcelas (virada de
ano, 1x, 100 em 3x); `POST` e as mensagens; `GET` com pago, restante, próxima e `atrasada`
(inclusive com os dias antes); marcar e desmarcar; editar e apagar; resumo com dívidas do mês e
atrasadas; relatório com a categoria "Dívidas"; 401 sem token.

```fish
curl -X POST -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" \
  -d '{"credor": "Tia Ana", "motivo": "Joia", "valor_total": "1000.00", "parcelas": 3, "mes_inicio": "2026-11"}' \
  http://127.0.0.1:8000/api/dividas/
```

## 6. 12b: o app

- **Aba "Dívidas"** (quinta aba, `hand-coins`, `src/app/(abas)/dividas.tsx`): faixa de parcelas
  atrasadas (singular e plural), botão "Nova dívida", um cartão por dívida
  (`CartaoDeDivida`: falta quanto, barra por parcelas pagas, próxima parcela ou "Atrasada: ..." ou
  "Tudo pago"), vazio "Nenhuma dívida cadastrada." e puxar para baixo.
- **Folha "Nova dívida"** (`FolhaDeNovaDivida`): cinco campos, validações no app na ordem do
  contrato (só a primeira aparece, sem chamar o servidor), prévia "3x de R$ 333,33 (a última de
  R$ 333,34)" calculada em **centavos inteiros** (mesma regra do backend, sem erro de ponto
  flutuante) e o `POST`.
- **Folha da dívida** (`FolhaDaDivida`): parcelas como `checkbox` (o leitor de tela diz
  "marcado" ou "não marcado"), com ícone e texto ("Paga", "A pagar", "Atrasada") para a cor não
  ser a única pista; marcar faz o `PATCH` e troca a dívida pela resposta; apagar pede dois toques
  ("Toque de novo para apagar"), sem diálogo do sistema.
- **Início**: "inclui R$ X de dívidas" embaixo do "Saiu" e a faixa "Há R$ X em parcelas de
  dívidas atrasadas.".
- `src/api.ts`: tipos e funções das dívidas; o `pedirApi` ganhou `DELETE`, trata o **204** (sem
  corpo, não dá para ler JSON) e passou a tratar 400 de um `POST` com corpo como "valor recusado".

Testes (`__tests__/dividas-test.tsx`, mais acréscimos no Início e nas abas; o app tem 181):
aba vazia; cartão com textos, barra e rótulo; sem motivo e quitada; faixa singular, plural e
ausente; carregando e erro; cada validação sem chamar a API; valores iniciais e prévias; salvar
com o corpo exato e o 400; parcelas com os três estados; marcar, desmarcar e erro; apagar com
dois toques; Início com dívidas; quinta aba.

## 7. Como usar

Aba Dívidas, "Nova dívida": "Tia", "Joia", "600", "2", "11/2026". Em novembro e dezembro aparecem
R$ 300,00 nas saídas e o "posso gastar" já desconta. Quando pagar, abra a dívida e toque na
parcela para marcar como paga.

## 8. Para depois

Editar "para quem" e "motivo" na folha (o `PATCH` já existe), quitadas no fim da lista, a faixa
do Início levando à aba e um ícone próprio para "Dívidas" no relatório.
