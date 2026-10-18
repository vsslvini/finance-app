# Plano do Módulo 12: dívidas (RF21)

Pedido do Vinicius em 2026-10-17: uma aba de dívidas para cadastrar valor, para quem, o motivo,
as parcelas e o mês de pagamento; a dívida vira parcelas já calculadas, e cada parcela conta como
saída no mês dela (ex.: "mês que vem pago X para a minha tia"). Decisões do Claude no modo
autônomo. 12a é o backend; 12b é o app.

## Decisões

1. **Dívida** = para quem, motivo (opcional), valor total, número de parcelas (1 a 120) e o mês
   da primeira parcela. Ao cadastrar, o backend gera as **parcelas**: valor total ÷ parcelas,
   arredondado para baixo no centavo, e a última parcela leva a sobra (R$ 1.000 em 3x =
   333,33 + 333,33 + 333,34), uma por mês a partir do mês escolhido.
2. **Não contar duas vezes.** Quando a pessoa paga de verdade (um PIX), o dinheiro aparece nas
   transações. Por isso cada parcela tem "paga" (sim ou não), marcada no app:
   - parcela **não paga** do mês: conta nas **saídas** do mês e é descontada do "posso gastar";
   - parcela **paga**: deixa de contar (o PIX real já está nas saídas).
3. **Atrasadas**: parcelas não pagas de meses anteriores ao mês atual do app. Não entram nas
   saídas do mês atual (já eram do mês delas), mas são descontadas do "posso gastar" (o dinheiro
   está comprometido) e aparecem como aviso.
4. Editar: só "para quem" e "motivo". Para mudar valor, parcelas ou mês, apaga e cadastra de novo
   (mais simples do que recalcular parcelas já pagas). Apagar leva as parcelas junto.
5. O relatório do mês mostra as parcelas não pagas do mês como uma categoria "Dívidas" nos gastos
   (e as saídas continuam iguais às do resumo).
6. Aba nova "Dívidas" (quinta aba, ícone `hand-coins`).

## 12a: backend (`python-backend-engineer`)

- App `planejamento`: models `Divida` (credor, motivo, valor_total, parcelas, mes_inicio como
  data no dia 1, criada_em) e `ParcelaDaDivida` (divida com `CASCADE`, numero, mes, valor, paga,
  paga_em). Migration. Admin.
- `planejamento/services/dividas.py`: gerar parcelas (função pura), totais do mês (não pagas do
  mês, atrasadas).
- Rotas (com token):
  - `GET /api/dividas/`: lista (mais recente primeiro) com `id`, `credor`, `motivo`,
    `valor_total`, `total_parcelas`, `parcelas_pagas`, `valor_pago`, `valor_restante`,
    `proxima_parcela` (`{id, numero, mes: "AAAA-MM", valor}` da primeira não paga, ou `null`) e
    `parcelas` (lista `{id, numero, mes, valor, paga}`).
  - `POST /api/dividas/` com `{credor, motivo, valor_total, parcelas, mes_inicio: "AAAA-MM"}`:
    cria e gera as parcelas; responde a dívida (201). Mensagens: "Informe para quem é a
    dívida.", "O valor precisa ser maior que zero.", "As parcelas precisam ficar entre 1 e
    120.", "Mês inválido. Use o formato AAAA-MM, ex.: 2026-11.".
  - `PATCH /api/dividas/<id>/` (credor, motivo) e `DELETE /api/dividas/<id>/` (204).
  - `PATCH /api/parcelas/<id>/` com `{paga: true|false}`: marca (e grava `paga_em` com hoje ou
    limpa); responde a dívida inteira atualizada.
- Resumo: campos novos `dividas_do_mes` (soma das não pagas do mês do resumo) e
  `dividas_atrasadas` (soma das não pagas de meses anteriores ao mês atual do app; "0.00" quando
  o resumo não é do mês atual). `saidas` passa a incluir `dividas_do_mes`. "Posso gastar" =
  (saldo − falta guardar − dividas_do_mes − dividas_atrasadas) ÷ dias.
- Relatório: `saidas` igual ao resumo; nos gastos, as não pagas do mês viram a categoria
  `{"categoria": "Dívidas", "categoria_original": "", ...}` (entra no total, na ordem e na
  porcentagem); não entram nos "maiores gastos" (não são transações).

Casos de teste (12a):

1. Gerar parcelas: 1.000 em 3x a partir de 2026-11 dá 333,33 (nov), 333,33 (dez) e 333,34
   (jan/2027); 500 em 1x dá uma parcela; 100 em 3x dá 33,33 + 33,33 + 33,34.
2. `POST` cria a dívida e as parcelas; recusa sem credor, valor zero ou negativo, parcelas 0 ou
   121 e mês em formato errado, com as mensagens.
3. `GET` traz os campos, `proxima_parcela` certa (e `null` quando tudo está pago), valores pago
   e restante.
4. `PATCH /api/parcelas/<id>/` marca e desmarca, grava e limpa `paga_em`, responde a dívida.
5. `PATCH` da dívida muda credor e motivo; `DELETE` apaga a dívida e as parcelas (204).
6. Resumo: parcela não paga do mês entra em `saidas` e em `dividas_do_mes`, e desconta do "posso
   gastar"; paga, não conta; de outro mês, não conta.
7. Resumo: parcela não paga de mês anterior entra em `dividas_atrasadas` e desconta do "posso
   gastar", mas não entra nas saídas do mês atual.
8. Relatório: categoria "Dívidas" com as não pagas do mês, saídas iguais às do resumo.
9. Tudo exige token (401).

## 12b: app

Contrato e casos de teste definidos depois do 12a, no mesmo arquivo.
