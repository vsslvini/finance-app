# Módulo 9: relatório do mês

Escrito em 2026-10-17. Atende RF27. Plano em
[`../../planos/modulo-9-relatorio.md`](../../planos/modulo-9-relatorio.md). **Antes, estude**
[`ajustes-do-mes.md`](ajustes-do-mes.md) (a regra de entradas e saídas) e
[`categorias.md`](categorias.md) (a tradução).

Este documento cobre o **9a (backend)**; a tela entra no 9b.

## 1. O que o módulo entrega

`GET /api/relatorio/?mes=AAAA-MM` (com token; sem `mes`, o mês atual do app): entradas, saídas e
saldo do mês (os mesmos números do Início), o total de gastos, os gastos por categoria (do maior
para o menor, com porcentagem) e os 5 maiores gastos. 13 testes novos; o backend tem 177.

Com os dados reais de outubro de 2026: entradas R$ 3.205,10, saídas R$ 2.812,06, saldo
R$ 393,04 e gastos R$ 2.849,58, com "Transferência - PIX" (37%) e "Transferências" (26%) no topo.

## 2. Por que dois totais diferentes

- **Saiu** (Início e relatório): o dinheiro que saiu da conta corrente, com a fatura paga.
- **Gastos** (só o relatório): o que foi consumido, com as compras do cartão. Para não contar o
  mesmo dinheiro duas vezes, o pagamento da fatura sai da conta, inclusive quando a Pluggy o marca
  como "Transfers": a regra `FATURA_PAGA_NA_CORRENTE` tira as transações da corrente com
  "fatura" na descrição (`descricao__icontains="fatura"`). No cartão, "fatura" na descrição não
  tira nada.

## 3. Conceitos novos

- **Extrair uma função para não copiar a regra**: `entradas_e_saidas(transacoes_do_mes)` saiu de
  dentro do `resumo_do_mes` e é usada pelo resumo e pelo relatório. Os testes antigos do resumo
  continuaram verdes, o que prova que o comportamento não mudou.
- **`icontains`**: filtro do Django que procura um trecho sem diferenciar maiúsculas
  ("Pagamento Fatura" e "pagamento de fatura").
- **Agrupar em Python com dicionário**: os gastos vêm numa consulta só, já ordenados do maior
  para o menor; o service soma por categoria num dicionário. Os 5 primeiros da lista são os
  maiores gastos.
- **`//`** (divisão inteira): `57 * 100 // 100` arredonda para baixo, como a porcentagem pede.

## 4. Arquivos

- `financas/services/resumo.py`: a função `entradas_e_saidas` extraída.
- `financas/services/relatorio.py` (novo): `relatorio_do_mes(mes, dias_antes=0,
  traducoes=None)`.
- `financas/serializers.py`: `CategoriaDoMesSerializer` e `RelatorioSerializer` (os maiores
  gastos usam o `TransacaoSerializer`).
- `financas/views.py` e `urls.py`: a view `relatorio` (mesmo caminho do resumo: dias antes,
  `ler_mes`, traduções lidas uma vez).

## 5. Os testes

`financas/tests/test_relatorio.py` (8) e `test_api_relatorio.py` (5):

1. `test_entradas_saidas_e_saldo_iguais_ao_resumo` (saldo negativo incluído).
2. `test_gastos_somam_corrente_e_cartao_e_tiram_o_que_nao_e_gasto`.
3. `test_fatura_na_descricao_do_cartao_continua_gasto`.
4. `test_gastos_por_categoria` e `test_categorias_com_o_mesmo_total_seguem_o_nome`.
5. `test_maiores_gastos_sao_os_cinco_maiores`.
6. `test_mes_segue_os_dias_antes`, `test_sem_gastos_tudo_zero_e_listas_vazias` e, pela rota,
   mês do app, mês inválido e mês sem gastos.
7. `test_relatorio_sem_token_responde_401`.

```fish
curl -H "Authorization: Token $TOKEN" "http://127.0.0.1:8000/api/relatorio/?mes=2026-10"
```

## 6. Limites

- PIX para uma conta própria que a Pluggy não marca como "Same person transfer" conta como gasto
  (ex.: "Transferência enviada pelo Pix|PICPAY IN", R$ 287,59 em outubro). Dá para corrigir
  trocando a categoria da transação (Módulo 8), mas a regra dos gastos olha a categoria da
  Pluggy, não a manual.
- Um PIX comum com "fatura" na descrição ("Fatura do condomínio") fica fora dos gastos.
- Parcelas com data futura dentro do mês contam como gasto.
