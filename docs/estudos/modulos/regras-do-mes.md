# Módulo 4a: regras do mês

Escrito em 2026-10-10. Atende RF30 (mês começando dias antes do dia 1) e RF31 (limite da
fatura com aviso), e muda a fórmula do RF18 (dúvida 5 de `docs/requisitos.md`). Só backend; a
tela que edita as configurações é o Módulo 4b. **Antes, estude**
[`resumo-do-mes.md`](resumo-do-mes.md) (a fórmula antiga) e [`../drf.md`](../drf.md) (views
com `@api_view` e serializers).

- [Módulo 4a: regras do mês](#módulo-4a-regras-do-mês)
  - [1. O que o módulo entrega](#1-o-que-o-módulo-entrega)
  - [2. As regras, em português](#2-as-regras-em-português)
  - [3. Conceitos novos](#3-conceitos-novos)
  - [4. O caminho de uma requisição](#4-o-caminho-de-uma-requisição)
  - [5. Arquivo por arquivo](#5-arquivo-por-arquivo)
  - [6. Os testes, um por um](#6-os-testes-um-por-um)
  - [7. Testar à mão](#7-testar-à-mão)
  - [8. Limites e próximos passos](#8-limites-e-próximos-passos)

## 1. O que o módulo entrega

- Um app Django novo, `planejamento`, com a tabela `Configuracao` (uma linha só):
  `dias_antes_do_mes` (0 a 10, padrão 0) e `limite_fatura` (em reais; vazio = sem limite).
- Rotas `GET` e `PATCH /api/configuracoes/` (com token), para o app ler e editar.
- O "mês do app": com 2 dias antes, outubro vai de 29/09 a 29/10. O resumo e as transações
  usam esse período.
- A fórmula nova do "posso gastar por dia" e dois campos novos no resumo: `limite_fatura` e
  `fatura_acima_do_limite`.
- 22 testes novos e 4 ajustados; o backend tem 90 testes.

## 2. As regras, em português

1. **Mês do app.** O mês M começa `N` dias antes do dia 1 de M e termina na véspera do começo
   do mês seguinte. Com N = 2: outubro de 2026 = 29/09 a 29/10; novembro começa em 30/10.
   Por que "dias antes" e não um dia fixo: o salário cai no penúltimo ou no último dia, e o
   penúltimo dia muda com o tamanho do mês (29/09, 30/10, 27/02). Contar 2 dias para trás a
   partir do dia 1 sempre acerta.
2. **Mês atual.** É o mês do app que contém hoje. Com N = 2, no dia 30/10 o app já está em
   novembro (o salário já caiu).
3. **Posso gastar por dia** = saldo das contas correntes ÷ dias que faltam até o fim do mês do
   app, contando hoje, arredondado para baixo. **A fatura não é descontada**: ela é paga com o
   salário do mês seguinte. Só existe no mês atual (nos outros, `null`).
4. **Aviso da fatura.** `fatura_acima_do_limite` é verdadeiro só quando existe limite e a
   fatura aberta passa dele (igual ao limite não avisa).

## 3. Conceitos novos

### Um app Django novo

Fonte: https://docs.djangoproject.com/en/6.1/ref/applications/ (conferido em 2026-10-10).

`financas` cuida dos dados que vêm dos bancos; `planejamento` cuida do que é seu (configurações
agora; metas e dívidas depois), como a arquitetura previa. Um app é uma pasta com
`models.py`, `views.py`, `urls.py` etc., registrada no `INSTALLED_APPS` do
`config/settings.py`. A ligação entre os dois é só esta: as views do `financas` leem a
`Configuracao`; os services continuam recebendo números.

### Tabela de uma linha só: `get_or_create(pk=1)`

Fonte: https://docs.djangoproject.com/en/6.1/ref/models/querysets/#get-or-create (conferido
em 2026-10-10).

```python
@classmethod
def atual(cls):
    configuracao, _ = cls.objects.get_or_create(pk=1)
    return configuracao
```

- `get_or_create` busca a linha com id 1; se não existir, cria com os valores padrão. Devolve
  o objeto e um `True/False` dizendo se criou (o `_` descarta esse segundo valor).
- `@classmethod` é um decorador (a "etiqueta" do [`../pytest.md`](../pytest.md), seção 3): a
  função pertence à classe, e não a uma linha. Por isso se chama `Configuracao.atual()`, sem
  ter um objeto antes. O `cls` é a própria classe `Configuracao`.
- No admin, o botão "Adicionar" foi desligado (`has_add_permission` devolve `False`): criar uma
  segunda linha à mão daria erro de id repetido no PostgreSQL, porque o `get_or_create` grava
  o id 1 sem passar pelo contador de ids.

### `PATCH` e `partial=True`

`PUT` substitui o objeto inteiro; `PATCH` muda só os campos enviados. No serializer,
`partial=True` diz "os campos que faltarem ficam como estão". Assim o app pode mandar só
`{"dias_antes_do_mes": 2}` sem apagar o limite.

### Validação com mensagem própria

O model limita `dias_antes_do_mes` a 0..10 (`MinValueValidator` e `MaxValueValidator`). O
serializer repete o limite com `min_value`, `max_value` e `error_messages`, só para trocar a
mensagem em inglês do DRF por "Os dias antes do mês precisam ficar entre 0 e 10.".

### `timedelta` e `data__range`

- `date(2026, 10, 1) - timedelta(days=2)` dá `date(2026, 9, 29)`: `timedelta` é "uma
  quantidade de tempo" que se soma ou subtrai de uma data.
- `filter(data__range=(inicio, fim))` traz as transações com `inicio <= data <= fim` (as duas
  pontas incluídas).

## 4. O caminho de uma requisição

`GET /api/resumo/` (sem `?mes=`), com N = 2 e hoje 10/10/2026:

```
App ──► config/urls.py ──► financas/urls.py ──► views.resumo
           (token conferido pelo DRF; sem token, 401)
                                │
             Configuracao.atual() ──► dias_antes = 2, limite = 1000.00
             timezone.localdate()  ──► hoje = 10/10/2026
             ler_mes(None, hoje, 2) ──► mes_atual: 10/10 + 2 = 12/10 ──► outubro
                                │
             resumo_do_mes(01/10/2026, hoje, 2, 1000.00)
                ├─ periodo_do_mes(2026, 10, 2) ──► 29/09 a 29/10
                ├─ transações com data entre 29/09 e 29/10 ──► entradas, saídas, últimos gastos
                ├─ saldo ÷ (29/10 - 10/10 + 1 = 20 dias) ──► posso gastar
                └─ fatura > 1000.00? ──► fatura_acima_do_limite
                                │
             ResumoSerializer (Decimal vira texto) ──► JSON
```

## 5. Arquivo por arquivo

### `backend/planejamento/` (novo)

| Arquivo | Para que serve |
|---|---|
| `models.py` | `Configuracao` e o `atual()` |
| `migrations/0001_initial.py` | cria a tabela (conferida com `makemigrations --check`) |
| `admin.py` | edição pelo admin, sem o botão "Adicionar" |
| `serializers.py` | `ConfiguracaoSerializer`, com a mensagem dos dias antes |
| `views.py` | `configuracoes`, com `@api_view(["GET", "PATCH"])` (só esses dois métodos) |
| `urls.py` | a rota `configuracoes/` |
| `tests/` | testes do model e da rota; `conftest.py` com a fixture `cliente_com_token` |

### `backend/financas/services/periodo.py` (novo)

`periodo_do_mes(ano, mes, dias_antes)` e `mes_atual(hoje, dias_antes)`: funções puras, sem
banco e sem relógio, fáceis de testar. Ficou no `financas` porque quem usa é o resumo e as
transações.

### `backend/financas/services/resumo.py` (alterado)

Assinatura nova: `resumo_do_mes(mes, hoje, dias_antes=0, limite=None)`. Filtra pelo período,
calcula a fórmula nova e devolve `limite_fatura` e `fatura_acima_do_limite`. Os valores padrão
(0 e `None`) mantêm o comportamento do calendário para quem não passa nada.

### `backend/financas/views.py`, `serializers.py` e `config/` (alterados)

- `ler_mes(texto, hoje, dias_antes)`: sem `?mes=`, usa o mês atual do app.
- `TransacoesView` e `resumo` leem a `Configuracao` e usam o período.
- `ResumoSerializer` ganhou os dois campos novos.
- `config/settings.py` registra o `planejamento`; `config/urls.py` liga as rotas dele sob
  `/api/`.

## 6. Os testes, um por um

Rodar só os deste módulo:
`pytest planejamento financas/tests/test_periodo.py financas/tests/test_resumo.py financas/tests/test_api_resumo.py financas/tests/test_api_transacoes.py -v`

### Configurações (`planejamento/tests/`)

- **`test_sem_nada_salvo_valem_os_padroes`** (caso 1): `atual()` num banco vazio dá 0 dias e
  sem limite. Garante que o app funciona logo depois do `migrate`.
- **`test_atual_usa_sempre_a_mesma_linha`**: duas chamadas, uma linha só no banco.
- **`test_configuracoes_sem_token_responde_401`** (caso 2): a rota nova também exige token.
- **`test_get_sem_nada_salvo_devolve_os_padroes`** (casos 1 e 2):
  `{"dias_antes_do_mes": 0, "limite_fatura": null}`.
- **`test_get_devolve_os_valores_salvos`** (caso 2): o dinheiro vem como texto (`"1500.00"`).
- **`test_patch_muda_os_dias_antes_e_o_limite`** (caso 3): salva os dois e devolve os valores
  novos.
- **`test_patch_aceita_limite_null`** (caso 3): `null` tira o limite e os dias antes não mudam
  (é o `partial=True` funcionando).
- **`test_patch_recusa_dias_antes_fora_de_0_a_10`** (caso 4): -1 e 11 recebem 400 com a
  mensagem em português, e o banco não muda.

### Período (`financas/tests/test_periodo.py`, sem banco)

- **`test_sem_dias_antes_outubro_e_o_mes_do_calendario`** (caso 5): 01/10 a 31/10.
- **`test_com_dois_dias_antes_outubro_comeca_em_setembro`** (caso 6): 29/09 a 29/10.
- **`test_com_dois_dias_antes_fevereiro`** (caso 7): 30/01 a 26/02 de 2027 (mês curto).
- **`test_com_dois_dias_antes_dia_30_de_outubro_ja_e_novembro`** (caso 8): 30/10 é novembro;
  29/10 ainda é outubro.

### Resumo (`financas/tests/test_resumo.py` e `test_api_resumo.py`)

- **`test_salario_no_fim_de_setembro_conta_em_outubro_com_dias_antes`** (caso 9): o motivo do
  RF30, um salário de 30/09 contando em outubro com 2 dias antes, e não com 0.
- **`test_resumo_usa_os_dias_antes_da_configuracao`** (caso 9, pela API): a view lê a
  configuração salva.
- **`test_posso_gastar_vai_ate_o_fim_do_periodo_sem_descontar_fatura`** (caso 10): hoje
  10/10, fim 29/10, 20 dias; saldo 2000 ÷ 20 = 100.00, e a fatura de 1240 não entra.
- **`test_posso_gastar_com_dias_antes_arredonda_para_baixo`** (caso 10): 100 ÷ 3 = 33.33.
- **`test_saldo_negativo_da_posso_gastar_negativo`** (caso 11): -240 ÷ 24 = -10.00.
- **`test_com_dias_antes_dia_30_outubro_ja_acabou`**: no dia 30/10 com 2 dias antes, o "posso
  gastar" de outubro é `null` (outubro já acabou para o app).
- **`test_fatura_acima_do_limite_avisa`**, **`test_fatura_igual_ou_abaixo_do_limite_nao_avisa`**
  e **`test_sem_limite_nao_avisa`** (caso 12): 1500.01 contra 1500.00 avisa; igual ou abaixo
  não; sem limite, nunca.
- **`test_resumo_mostra_o_limite_e_o_aviso_da_fatura`** (caso 12, pela API): limite 500 e
  fatura 600 dão `"limite_fatura": "500.00"` e `true`.

### Transações (`financas/tests/test_api_transacoes.py`)

- **`test_mes_com_dias_antes_usa_o_periodo_do_app`** (caso 13): com 2 dias antes,
  `?mes=2026-10` traz 29/09 e 29/10 e deixa de fora 28/09 e 30/10 (as duas bordas).

### Testes antigos ajustados (porque a regra mudou)

- `test_posso_gastar_por_dia_divide_pelos_dias_restantes` e `test_ultimo_dia_do_mes_conta_um_dia`:
  os valores esperados agora não descontam a fatura.
- `test_fatura_maior_que_saldo_da_valor_negativo` virou
  `test_saldo_negativo_da_posso_gastar_negativo`: o caso antigo só existia por causa do
  desconto da fatura.
- `test_resumo_traz_as_chaves_e_dinheiro_como_texto`: a lista de chaves ganhou as duas novas.

## 7. Testar à mão

Dentro de `backend/`, com o venv ativo e o Docker no ar:

1. `python manage.py migrate`: espere `Applying planejamento.0001_initial... OK`.
2. Com o `runserver` no ar:
   - `curl -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/configuracoes/`:
     espere `{"dias_antes_do_mes":0,"limite_fatura":null}`;
   - `curl -X PATCH -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" -d '{"dias_antes_do_mes": 2, "limite_fatura": "1000.00"}' http://127.0.0.1:8000/api/configuracoes/`;
   - `curl -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/resumo/`: as
     `entradas` devem incluir o salário do fim do mês anterior, e aparecem `limite_fatura` e
     `fatura_acima_do_limite`.
3. No admin (`/admin/`), "Configurações" mostra a linha e permite editar.

Até o Módulo 4b, a tela do app ainda mostra o aviso antigo ("A fatura aberta é maior que o
saldo.") quando o "posso gastar" fica negativo; com a regra nova, isso só acontece com saldo
negativo. O 4b troca esse aviso pelo do limite.

## 8. Limites e próximos passos

- O `PATCH` aceita limite negativo (não estava nos casos); um limite negativo deixaria o aviso
  sempre ligado. Vale um validador quando o 4b criar a edição no app.
- A fixture `cliente_com_token` existe em dois `conftest.py` (um por app). Dá para juntar num
  `backend/conftest.py` mais tarde.
- Parcelas futuras do mês continuam contando em `saidas` (limite antigo do resumo).
- **4b:** design B na tela Início, edição tocando no saldo e na fatura, aviso do limite.
- **Módulo 5:** plano de guardar, com os investimentos da Pluggy como "já guardado".
