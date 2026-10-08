# Módulo 2: resumo do mês

Escrito em 2026-10-08. Este é o passo 5 da arquitetura (`docs/arquitetura.md`, seção 5)
e atende RF15 a RF18. **Antes, estude o Módulo 1** (`api-de-leitura.md`): este módulo
reaproveita o token, o `ler_mes` e o `TransacaoSerializer` de lá.

- [Módulo 2: resumo do mês](#módulo-2-resumo-do-mês)
  - [1. O que o módulo entrega](#1-o-que-o-módulo-entrega)
  - [2. As regras de dinheiro, em português](#2-as-regras-de-dinheiro-em-português)
  - [3. Conceitos novos](#3-conceitos-novos)
  - [4. O caminho de uma requisição](#4-o-caminho-de-uma-requisição)
  - [5. Arquivo por arquivo](#5-arquivo-por-arquivo)
  - [6. Os testes, um por um](#6-os-testes-um-por-um)
  - [7. Testar à mão](#7-testar-à-mão)
  - [8. Limites conhecidos](#8-limites-conhecidos)
  - [9. Para estudar mais](#9-para-estudar-mais)

## 1. O que o módulo entrega

Uma rota: `GET /api/resumo/?mes=2026-10` (sem `?mes=`, o mês atual; com token). Ela
responde, por exemplo:

```json
{
  "saldo_total": "1250.50",
  "fatura_aberta": "499.90",
  "entradas": "3000.00",
  "saidas": "1830.45",
  "posso_gastar_por_dia": "31.31",
  "ultimos_gastos": [ { "id": 812, "data": "2026-10-08", "descricao": "Mercado", "...": "..." } ]
}
```

É tudo o que a tela inicial do app vai precisar numa chamada só. Números: 16 testes
novos (13 do service, 3 da rota); o backend inteiro tem 68, todos passando, e o lint
passa.

## 2. As regras de dinheiro, em português

Decididas em 2026-10-08 (`docs/requisitos.md`, dúvidas 5 e 7):

| Campo | Regra | Por quê |
|---|---|---|
| `saldo_total` | soma dos saldos das **contas correntes** | o "saldo" de um cartão é a fatura, não dinheiro seu |
| `fatura_aberta` | soma dos saldos dos **cartões** | quanto você deve hoje nos cartões |
| `entradas` | soma dos valores **positivos** das contas correntes no mês | dinheiro que entrou de verdade. Positivo no cartão é estorno ou pagamento da fatura, não dinheiro novo |
| `saidas` | soma dos valores **negativos** do mês, das correntes **e** dos cartões, mostrada como número positivo | compra no cartão é gasto no dia da compra |
| `posso_gastar_por_dia` | (saldo_total menos fatura_aberta), dividido pelos dias que faltam no mês **contando hoje** | quanto sobra por dia sem ficar devendo |
| `ultimos_gastos` | as 5 saídas mais novas do mês, até hoje | o que você gastou por último |

Duas exclusões, para **não contar o mesmo dinheiro duas vezes**:

- **`Credit card payment`** (pagamento da fatura) não conta como saída. Exemplo: você
  compra R$ 100 no cartão (saída de R$ 100) e depois paga a fatura pela conta corrente
  (mais R$ 100 saindo). Se as duas contassem, os gastos dariam R$ 200, mas você só gastou
  R$ 100.
- **`Same person transfer ...`** (transferência entre contas suas, como `Same person
  transfer - PIX`) não conta como entrada nem como saída. Um Pix de R$ 500 do Nubank
  para o Inter sai de uma conta e entra na outra: não é gasto nem ganho.

Os nomes vêm em inglês porque é assim que a Pluggy manda (`docs/pluggy.md`, seção 7).

Detalhes do "posso gastar por dia":

- **Contando hoje:** no dia 08/10, faltam 24 dias (do 8 ao 31). No dia 31, falta 1 (e não
  0); por isso nunca há divisão por zero.
- **Arredonda para baixo, sempre:** R$ 100 em 3 dias dá 33,333...; o app mostra
  `33.33`, nunca `33.34`. Nos negativos também vai "para baixo" (`-3.333...` vira
  `-3.34`), para nunca parecer melhor do que é.
- **Pode dar negativo:** se a fatura for maior que o saldo, você já está no vermelho, e o
  número mostra isso.
- **Só no mês atual:** olhando setembro, "quanto posso gastar por dia" não faz sentido, e
  o campo vem `null`.

## 3. Conceitos novos

### Service com "hoje" como parâmetro

A função do cálculo é `resumo_do_mes(mes, hoje)`. Ela poderia descobrir a data de hoje
sozinha, mas aí cada teste daria um resultado diferente conforme o dia em que fosse
rodado: "faltam 24 dias" só é verdade no dia 8. Recebendo `hoje` de fora, o teste
escolhe o dia (`HOJE = date(2026, 10, 8)`) e o resultado é sempre o mesmo. A view, que
roda de verdade, passa `timezone.localdate()`.

Isso é uma alternativa ao `monkeypatch` (`docs/estudos/pytest.md`, seção 4): em vez de
trocar uma função durante o teste, o código já é escrito para receber de fora o que
muda. Quando dá para fazer assim, é mais simples.

### `Q`: condições guardadas numa variável

Fonte: https://docs.djangoproject.com/en/6.1/topics/db/queries/#complex-lookups-with-q-objects

Normalmente o filtro vai direto na consulta: `.filter(categoria_pluggy="Credit card
payment")`. O `Q(...)` guarda essa mesma condição num objeto, que pode ser:

- guardado numa constante e reusado em várias consultas;
- combinado: `|` é "ou", `&` é "e", `~` é "não".

```python
TRANSFERENCIA_PROPRIA = Q(categoria_pluggy__startswith="Same person transfer")
PAGAMENTO_DE_FATURA = Q(categoria_pluggy="Credit card payment")
NAO_E_GASTO = TRANSFERENCIA_PROPRIA | PAGAMENTO_DE_FATURA   # um OU outro
```

E então `.exclude(NAO_E_GASTO)` tira as duas de uma vez. As regras de exclusão ficam
**num lugar só**: se amanhã surgir outra categoria para excluir, muda uma linha.

`__startswith` é um "lookup" do Django: "o texto começa com". Ele pega
`Same person transfer - PIX`, `- TED` e `- Cash` sem listar cada uma.

### `aggregate` e `Sum`

Fonte: https://docs.djangoproject.com/en/6.1/topics/db/aggregation/

`queryset.aggregate(total=Sum("valor"))` pede ao PostgreSQL a soma da coluna, numa
consulta só, e devolve `{"total": Decimal("...")}`. O banco soma sem trazer as linhas
para o Python, então é rápido mesmo com mil transações. Já usamos o `Max` do mesmo jeito
no Módulo 1.

Pegadinha: a soma de **nenhuma** linha é `None` (e não zero). Por isso existe o
`somar()`, que troca `None` por `Decimal("0.00")` com `or ZERO`.

### `quantize` e `ROUND_FLOOR`

Fonte: https://docs.python.org/3/library/decimal.html#decimal.Decimal.quantize

Dividir `Decimal` pode dar infinitas casas (`100 / 3`). O `quantize(Decimal("0.01"))`
corta em 2 casas, e o `rounding=` diz como:

| `rounding` | `33.333` | `-3.333` | Uso |
|---|---|---|---|
| `ROUND_HALF_UP` | `33.33` | `-3.33` | o "arredondar da escola" |
| `ROUND_DOWN` | `33.33` | `-3.33` | corta, indo em direção ao zero |
| `ROUND_FLOOR` | `33.33` | `-3.34` | sempre para o número menor (o "chão") |

Usamos `ROUND_FLOOR` porque, no negativo, o `ROUND_DOWN` mostraria uma situação melhor
do que a real.

### `Serializer` comum (sem model)

Fonte: https://www.django-rest-framework.org/api-guide/serializers/

No Módulo 1 os serializers eram `ModelSerializer` (ligados a um model). O resumo não é
um model, é um dicionário calculado. Para isso existe o `serializers.Serializer`
comum: você declara cada campo à mão, e ele lê os valores do dicionário pela chave.

Por que precisamos dele aqui: um `Decimal` solto num `Response` vira **número** no JSON
(`1000.0`), porque o "tradutor" de JSON do DRF converte `Decimal` em `float`. Só o
`DecimalField` de um serializer devolve **texto** (`"1000.00"`). O agente conferiu isso
no código do DRF 3.18.1 (`rest_framework/utils/encoders.py`). Sem o serializer, o resumo
daria números quebrados e ficaria diferente das outras rotas.

Um serializer pode conter outro: `ultimos_gastos = TransacaoSerializer(many=True)`
reaproveita o formato das transações (`many=True` porque é uma lista).

## 4. O caminho de uma requisição

```
App ──► /api/resumo/ ──► view resumo (token conferido antes, como no Módulo 1)
                              │
                              ├─ ler_mes(...)            (400 se o mês for inválido)
                              ├─ resumo_do_mes(mes, hoje) ──► 5 consultas ao PostgreSQL
                              │        └─ devolve um dict com Decimals e Transacoes
                              └─ ResumoSerializer(dict).data ──► JSON com textos
```

As consultas: duas somas de saldo (correntes e cartões), uma de entradas, uma de saídas
e uma busca dos 5 últimos gastos (com `select_related`, sem N+1).

## 5. Arquivo por arquivo

### `backend/financas/services/resumo.py` (novo)

- Constantes `TRANSFERENCIA_PROPRIA`, `PAGAMENTO_DE_FATURA` e `NAO_E_GASTO` (seção 3).
- `somar(queryset, campo)`: soma uma coluna e troca `None` por `0.00`.
- `resumo_do_mes(mes, hoje)`:
  - `transacoes_do_mes`: as transações do ano e mês pedidos. É a base de tudo.
  - `gastos`: as saídas (`valor__lt=0`, "menor que zero") sem as exclusões. Serve para
    `saidas` e para `ultimos_gastos`, então as duas usam a mesma regra.
  - `entradas`: só contas correntes, positivos (`valor__gt=0`), sem transferências
    próprias.
  - `saidas = abs(...)`: as saídas são negativas no banco; o `abs` devolve o valor
    positivo. O agente escolheu `abs` em vez de um `-` na frente porque
    `-Decimal("0.00")` vira `-0.00`, e isso apareceria como `"-0.00"` no app.
  - `posso_gastar_por_dia`: só se `(ano, mês)` pedido for igual ao de hoje.
    `calendar.monthrange(ano, mes)[1]` dá o último dia do mês (28, 29, 30 ou 31, já
    contando ano bissexto). Dias restantes = último dia, menos o dia de hoje, mais 1.
  - `ultimos_gastos`: `gastos` com `data__lte=hoje` ("menor ou igual a hoje"), porque a
    Pluggy já manda parcelas com data futura. Os `[:5]` viram `LIMIT 5` no SQL; o
    `list(...)` executa a consulta ali mesmo.
  - Devolve um dicionário com as 6 chaves.

### `backend/financas/serializers.py` (alterado)

`ResumoSerializer` (seção 3): quatro `DecimalField(max_digits=12, decimal_places=2)`
(os mesmos limites dos models), `posso_gastar_por_dia` com `allow_null=True` (aceita
`None`) e `ultimos_gastos = TransacaoSerializer(many=True)`.

### `backend/financas/views.py` (alterado)

A view `resumo`, com `@api_view(["GET"])`, tem três linhas: lê o mês, chama o service e
devolve o serializer. Esse é o padrão "a view só chama o service" (`docs/arquitetura.md`):
a regra mora no service, e o service pode ser testado sem HTTP. Ela reaproveita o
`ler_mes`, então o mês inválido dá exatamente o mesmo `400` das transações.

O service é importado como função (`from financas.services.resumo import
resumo_do_mes`), diferente do `sincronizacao`. Aqui pode, porque nenhum teste troca o
`resumo_do_mes` com `monkeypatch`.

### `backend/financas/urls.py` (alterado)

`path("resumo/", views.resumo, name="resumo")`.

## 6. Os testes, um por um

### `financas/tests/test_resumo.py` (13 testes do service)

Testam a função direto, sem HTTP e sem token. São mais rápidos e mostram exatamente qual
regra quebrou. Dia fixo: `HOJE = date(2026, 10, 8)` e `OUTUBRO = date(2026, 10, 1)`.

Ajudantes: fixture `conexao`; `criar_conta(conexao, **campos)` (corrente com saldo 0);
fixtures `corrente` e `cartao`; `criar_transacao(conta, **campos)` (05/10, "Padaria",
`-10.00`). Os testes que só usam funções ajudantes (sem fixture de dados) pedem `db`
direto, como `test_sem_dados_tudo_zero(db)`.

| Teste | Prepara | Confere | Por que existe |
|---|---|---|---|
| `test_saldo_soma_correntes_e_fatura_soma_cartoes` | 2 correntes (1000 e 250,50) e 2 cartões (400 e 99,90) | saldo 1250,50; fatura 499,90 | o saldo não pode misturar fatura |
| `test_entradas_somam_positivos_da_corrente_no_mes` | entradas em outubro, uma saída, uma entrada em 30/09 e uma em 01/11 | só as entradas de outubro | bordas do mês e só positivos |
| `test_saidas_somam_cartao_e_corrente` | saídas no cartão e na corrente, uma entrada e outro mês | soma das duas origens, positiva | compra no cartão é gasto |
| `test_pagamento_de_fatura_nao_conta_em_saidas` | compra no cartão e `Credit card payment` na corrente | só a compra | decisão 7: sem contar duas vezes |
| `test_transferencia_entre_contas_proprias_nao_conta` | `Same person transfer - PIX` e `- TED`, entrando e saindo | entradas e saídas zeradas | confere o `__startswith` com duas variações |
| `test_positivo_no_cartao_nao_conta_como_entrada` | estorno (positivo) no cartão | entradas 0 | estorno não é dinheiro novo |
| `test_posso_gastar_por_dia_divide_pelos_dias_restantes` | saldo 1000, fatura 400 | `25.00` (600 / 24) | a fórmula da decisão 5 |
| `test_ultimo_dia_do_mes_conta_um_dia` | mesmo saldo, hoje 31/10 | `600.00` | 1 dia, sem divisão por zero |
| `test_posso_gastar_arredonda_para_baixo` | saldo 100, hoje 29/10 (3 dias) | `33.33` | o arredondamento |
| `test_fatura_maior_que_saldo_da_valor_negativo` | saldo 100, fatura 400 | `-12.50` | o vermelho aparece |
| `test_outro_mes_nao_tem_posso_gastar` | setembro, com hoje em outubro | `None` | só faz sentido no mês atual |
| `test_ultimos_gastos` | 7 gastos (dias 1 a 7), uma parcela no dia 9, um pagamento de fatura, um Pix para si mesmo e um salário | os dias 7, 6, 5, 4 e 3, nessa ordem | o limite de 5, a ordem, a data futura e as exclusões, num teste só |
| `test_sem_dados_tudo_zero` | nada | quatro `0.00` e lista vazia | o `somar()` não pode devolver `None` |

No `test_ultimos_gastos`, a lista `gastos` é montada com uma "list comprehension":
`[criar_transacao(...) for dia in range(1, 8)]` cria uma transação para cada dia de 1 a
7 e guarda todas numa lista. `gastos[6]` é o dia 7 (a lista começa no índice 0). O teste
compara objetos `Transacao` direto (`==`): o Django considera iguais dois objetos do
mesmo model com o mesmo id.

### `financas/tests/test_api_resumo.py` (3 testes da rota)

Aqui a pergunta é outra: "a rota liga as peças certo?". As regras já estão testadas
acima, então estes testes são poucos.

| Teste | Confere |
|---|---|
| `test_resumo_sem_token_responde_401` | 401 sem token |
| `test_resumo_traz_as_chaves_e_dinheiro_como_texto` | 200; **exatamente** as 6 chaves (`set(dados)` dá o conjunto das chaves); o dinheiro como texto; `ultimos_gastos` no formato do `TransacaoSerializer` |
| `test_resumo_mes_invalido_responde_400_com_mensagem` | `2026-13` e `abc` dão 400 com a mensagem das transações |

No segundo teste, a rota usa o dia de verdade (`timezone.localdate()`), então o
`posso_gastar_por_dia` muda conforme o dia. Por isso ele confere só que o valor veio
como texto (`isinstance(..., str)`); o valor exato já foi testado no service.

### Rodar só os testes deste módulo

```
cd backend
pytest financas/tests/test_resumo.py financas/tests/test_api_resumo.py -v
```

## 7. Testar à mão

Com o `migrate` e o token do Módulo 1 já feitos (`api-de-leitura.md`, seção 6) e o
`runserver` no ar:

```
set TOKEN cole_o_token_aqui
curl -s -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/resumo/
curl -s -H "Authorization: Token $TOKEN" "http://127.0.0.1:8000/api/resumo/?mes=2026-09"
```

O primeiro traz o mês atual; o segundo traz setembro, com `posso_gastar_por_dia` igual a
`null`. Com `-s` (silencioso), o `curl` mostra só o JSON. Para ver o JSON formatado, acrescente
`| python -m json.tool` no fim.

Vale conferir com os seus dados reais se os números fazem sentido (por exemplo, se o
`saldo_total` bate com o que os apps dos bancos mostram). Se algo parecer estranho, a
causa provável está na seção 8.

## 8. Limites conhecidos

- **Parcelas futuras do mês contam em `saidas`.** Uma parcela com data de 25/10 já soma
  em outubro, mesmo que hoje seja dia 8. Os `ultimos_gastos` cortam datas futuras, mas o
  total não.
- **Compras no cartão contam no dia da compra**, e não no mês da fatura em que caem.
  Fica para o RF13 (faturas futuras).
- **O "posso gastar por dia" não desconta parcelas** que ainda vão cair no mês, nem metas
  e dívidas (RF23, para depois).
- **O saldo do cartão é tratado como positivo quando há dívida**, como a Pluggy mandou
  no teste real. Se algum banco mandar negativo, o cálculo erra.
- **As exclusões dependem do texto em inglês da Pluggy.** Se a Pluggy mudar os nomes, ou
  se passarmos a traduzir as categorias, as constantes do `resumo.py` precisam
  acompanhar. A comparação usa a `categoria_pluggy`, e não a manual: mudar a categoria
  de um pagamento de fatura no app não faz ele virar gasto.

## 9. Para estudar mais

- Django, `Q`: https://docs.djangoproject.com/en/6.1/topics/db/queries/#complex-lookups-with-q-objects
- Django, lookups (`__startswith`, `__lt`, `__gt`, `__lte`): https://docs.djangoproject.com/en/6.1/ref/models/querysets/#field-lookups
- Django, agregação (`Sum`): https://docs.djangoproject.com/en/6.1/topics/db/aggregation/
- Python, `decimal` e `quantize`: https://docs.python.org/3/library/decimal.html
- Python, `calendar.monthrange`: https://docs.python.org/3/library/calendar.html#calendar.monthrange
- DRF, `Serializer` comum e serializers aninhados: https://www.django-rest-framework.org/api-guide/relations/#nested-relationships
- Este projeto, `docs/estudos/drf.md` (seção 2.5, serializers).
