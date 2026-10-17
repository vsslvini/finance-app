# Módulo 5a: guardado (backend)

Escrito em 2026-10-17. Atende RF04 (valor guardado em investimentos), RF28 (plano de guardar)
e RF29 (descontar do "posso gastar" o que falta guardar no mês). Só backend; a seção da tela
Início é o Módulo 5b. O plano aprovado está em
[`../../planos/modulo-5-guardado.md`](../../planos/modulo-5-guardado.md). **Antes, estude**
[`regras-do-mes.md`](regras-do-mes.md) (tabela de uma linha, `PATCH`, mês do app) e
[`ajustes-do-mes.md`](ajustes-do-mes.md) (as categorias de investimento com `Q`).

- [Módulo 5a: guardado (backend)](#módulo-5a-guardado-backend)
  - [1. O que o módulo entrega](#1-o-que-o-módulo-entrega)
  - [2. As regras, em português](#2-as-regras-em-português)
  - [3. Conceitos novos](#3-conceitos-novos)
  - [4. O caminho de uma requisição](#4-o-caminho-de-uma-requisição)
  - [5. Arquivo por arquivo](#5-arquivo-por-arquivo)
  - [6. Os testes, um por um](#6-os-testes-um-por-um)
  - [7. Testar à mão](#7-testar-à-mão)
  - [8. Limites e próximos passos](#8-limites-e-próximos-passos)

## 1. O que o módulo entrega

- O `sincronizar()` passa a buscar os investimentos de cada conexão na Pluggy e guarda numa
  tabela nova, `Investimento` (app `financas`).
- Uma tabela de uma linha só, `PlanoDeGuardar` (app `planejamento`): valor por mês e mês alvo.
- Rotas `GET` e `PATCH /api/plano/` (com token), para o app ler e editar o plano.
- Um bloco novo no `GET /api/resumo/`, o `guardado`, e o "posso gastar por dia" descontando o
  que falta guardar no mês.
- 37 testes novos e 2 testes antigos ajustados; o backend passa a ter 135 testes.

## 2. As regras, em português

Exemplo usado em todo o módulo: R$ 1.300 nos investimentos, plano de R$ 500 por mês até
julho de 2027, e hoje é outubro de 2026.

1. **Guardado hoje** (`total`): soma dos saldos de **todos** os investimentos da Pluggy. Um
   investimento resgatado (`TOTAL_WITHDRAWAL`) vem com saldo zero, então não atrapalha.
2. **Guardado este mês** (`este_mes`): aplicações menos resgates **na conta corrente**, no mês do
   app. Aplicação é uma saída (valor negativo), então `este_mes = -(soma dessas transações)`.
   As transações são reconhecidas pelas mesmas categorias de investimento do Módulo 4c.
3. **Plano**: os dois campos preenchidos, ou os dois vazios (sem plano). Metade não vale.
4. **Previsto**: guardado hoje + valor por mês × meses do mês atual até o mês alvo, contando os
   dois. De outubro de 2026 a julho de 2027 são 10 meses, então 1.300 + 10 × 500 = 6.300.
   **Se o mês atual já foi guardado** (`este_mes >= valor por mês`), ele sai da conta, porque o
   dinheiro dele já está nos 1.300: 1.300 + 9 × 500 = 5.800. Mês alvo que já passou: previsto =
   guardado hoje.
5. **Progresso**: guardado hoje ÷ previsto, em %, arredondado para baixo (1.300 de 5.800 =
   22,41%, vira 22). Sem plano, ou com previsto zero, vem `null`.
6. **Falta guardar no mês**: valor por mês − guardado este mês, nunca menos que zero. Sem plano,
   zero.
7. **Posso gastar por dia** = (saldo das correntes − falta guardar no mês) ÷ dias que faltam.
   Quando o dinheiro é aplicado, ele sai do saldo e o "falta guardar" cai junto, então o
   desconto some sozinho e nada é descontado duas vezes (RF29).
8. **Mês alvo no passado**: o `PATCH` recusa um mês alvo antes do mês atual **do app** (com os
   dias antes). Com 2 dias antes, no dia 30/10 o app já está em novembro, então outubro já é
   passado.

## 3. Conceitos novos

### Duas formas de paginar

A Pluggy entrega listas grandes em páginas. As transações usam um **cursor**: cada resposta traz
um `next`, que diz onde continuar. Os investimentos usam **número de página**: a resposta diz
`totalPages`, e pedimos `page=1`, `page=2`... até chegar nele. Por isso o laço de
`listar_investimentos` é diferente do de `listar_transacoes`. Sem nenhum investimento,
`totalPages` vem 0 e o laço para depois da primeira chamada.

### Funções puras

`financas/services/guardado.py` só recebe números e datas e devolve números: não lê o banco nem
o relógio. Isso deixa os testes dele muito simples (sem a fixture `db`, sem `monkeypatch`) e
rápidos. Quem busca os números no banco é o `resumo_do_mes`, que chama essas funções.

### `math.floor` para o progresso

`math.floor(22.41)` dá `22`: arredonda para baixo, como o "posso gastar". Aqui o resultado é um
número inteiro (não é dinheiro), por isso não usamos `quantize`.

### Um mês guardado como data

O banco não tem um tipo "mês". Guardamos o mês alvo como `DateField` sempre no dia 1
(julho de 2027 = 01/07/2027). Na API ele vira o texto `"2027-07"`: no serializer, o
`input_formats=["%Y-%m"]` ensina o DRF a ler esse formato, e o `format="%Y-%m"` a escrever de
volta. `%Y` é o ano com 4 dígitos e `%m` o mês com 2 (os mesmos códigos do `strftime` do
Python).

### Validação de dois campos juntos: `validate()`

`validate_valor_mensal` e `validate_mes_alvo` olham um campo de cada vez. Para a regra "os dois
ou nenhum", o serializer precisa ver os dois juntos, e para isso existe o método `validate(self,
dados)`. Como o `PATCH` usa `partial=True`, `dados` só tem o que veio no pedido; o que não veio
é lido do que já está salvo (`self.instance`). O erro de `validate()` volta na chave
`non_field_errors`, porque não é de um campo só.

### `context`: passar um valor da view para o serializer

O serializer precisa saber qual é o mês atual do app para recusar o mês no passado, mas quem sabe
o dia de hoje e a configuração é a view. A view entrega isso pelo `context={"mes_atual": ...}`,
e o serializer lê `self.context["mes_atual"]`. Assim os testes trocam só o
`timezone.localdate` e o serializer não precisa olhar o relógio.

### Serializer dentro de serializer

O bloco `guardado` do resumo é um `GuardadoSerializer` usado como campo do `ResumoSerializer`. E
o `plano` dentro dele é o próprio `PlanoDeGuardarSerializer` da rota `/api/plano/`, com
`allow_null=True` (sem plano, sai `null`). Assim o mês alvo sai igual (`"2027-07"`) nas duas
rotas, sem repetir código.

## 4. O caminho de uma requisição

`GET /api/resumo/`, do app até a resposta:

1. `config/urls.py` manda `/api/` para `financas/urls.py`, que chama a view `resumo`.
2. A view (`financas/views.py`) lê a `Configuracao` (dias antes, limite da fatura) e o
   `PlanoDeGuardar` (valor por mês, mês alvo), descobre o mês pedido e chama
   `resumo_do_mes(...)`, passando os dois campos do plano.
3. `resumo_do_mes` (`financas/services/resumo.py`):
   - soma os saldos dos `Investimento` (o `total`);
   - filtra as transações da corrente no mês do app com as categorias de investimento e troca
     o sinal (o `este_mes`);
   - chama `bloco_guardado(...)` (`financas/services/guardado.py`), que devolve previsto,
     progresso e falta guardar;
   - desconta o `falta_guardar_no_mes` do saldo antes de dividir pelos dias.
4. A view passa o dicionário pelo `ResumoSerializer`, que transforma `Decimal` em texto
   (`"6300.00"`) e o mês alvo em `"2027-07"`.

`PATCH /api/plano/` com `{"valor_mensal": "500.00", "mes_alvo": "2027-07"}`:

1. `planejamento/urls.py` chama a view `plano` (`planejamento/views.py`).
2. A view pega a linha única do plano (`PlanoDeGuardar.atual()`), calcula o mês atual do app
   (`mes_atual`, do Módulo 4a) e cria o serializer com `partial=True` e o `context`.
3. `is_valid(raise_exception=True)` roda as validações; se alguma falhar, o DRF responde 400
   com as mensagens em português.
4. `save()` grava, e a resposta é o plano como ficou.

## 5. Arquivo por arquivo

### `backend/financas/` (alterados e novos)

- `integracoes/pluggy.py`: `listar_investimentos(api_key, item_id)`, com a paginação por número
  de página. Recebe a chave como as outras funções do cliente.
- `models.py`: model `Investimento`. A conexão usa `PROTECT` (como `Conta`), o `id_pluggy` é
  único (para atualizar em vez de duplicar) e o saldo é `DecimalField` (RNF04).
- `migrations/0002_investimento.py` (novo): cria a tabela.
- `admin.py`: mostra os investimentos no admin.
- `services/sincronizacao.py`: `salvar_investimento` (cria ou atualiza com `update_or_create`)
  e `apagar_investimentos_que_sumiram` (apaga, só daquela conexão, o que não veio mais).
  Diferente das transações, aqui a Pluggy devolve a lista inteira e não há nada manual para
  proteger, então pode apagar tudo o que sumiu.
- `services/guardado.py` (novo): `meses_ate` e `bloco_guardado`, as contas puras.
- `services/resumo.py`: busca `total` e `este_mes` e desconta o "falta guardar". Reaproveita a
  constante `INVESTIMENTO` do Módulo 4c, sem repetir a lista de categorias. O `ZERO - soma` (em
  vez de `-soma`) evita aparecer `"-0.00"` quando não há aplicação.
- `serializers.py`: `GuardadoSerializer` e o campo `guardado` no `ResumoSerializer`.
- `views.py`: o `resumo` lê o plano e passa os dois campos ao service.

### `backend/planejamento/` (alterados e novos)

- `models.py`: `PlanoDeGuardar`, com `atual()` igual ao da `Configuracao` (`get_or_create(pk=1)`).
- `migrations/0002_planodeguardar.py` (novo): cria a tabela.
- `admin.py`: mostra o plano no admin, sem o botão "adicionar" (é uma linha só).
- `serializers.py`: `PlanoDeGuardarSerializer`, com as quatro mensagens de erro em português.
- `views.py` e `urls.py`: a view `plano` e a rota `plano/`. A view importa `mes_atual` de
  `financas/services/periodo.py`, então o `planejamento` passa a usar uma função do `financas`
  (sem import circular, porque `periodo.py` não importa nada do projeto).

### Documentação

- `docs/pluggy.md`, seção 9: rota, paginação, campos e limites de `GET /investments`, com fontes.

## 6. Os testes, um por um

Rodar só os testes deste módulo:
`cd backend && pytest -v financas/tests/test_guardado.py planejamento/tests/test_api_plano.py`.
Os números entre parênteses são os casos aprovados no plano.

### Cliente da Pluggy (`financas/tests/test_pluggy.py`), caso 1

O `requests.get` é trocado por um falso (como nos testes antigos do cliente), sem internet.

- `test_listar_investimentos_junta_as_duas_paginas`: a Pluggy falsa responde duas páginas.
  Confere que a lista final tem os dois investimentos, que foram feitas duas chamadas (`page`
  1 e 2, com o `itemId` certo e a chave no cabeçalho) e que há limite de tempo.
- `test_listar_investimentos_sem_nenhum`: com `totalPages` 0, faz uma chamada só e devolve
  lista vazia. Protege contra um laço que pediria a página 2 à toa.

### Sincronização (`financas/tests/test_sincronizacao.py`), caso 2

A fixture `dados_pluggy` ganhou uma lista de investimentos por conexão (vazia por padrão) e troca
também o `listar_investimentos`. Sem isso, os testes antigos chamariam a Pluggy de verdade.

- `test_investimento_vira_investimento_da_conexao`: dois investimentos viram dois
  `Investimento` da conexão certa, com todos os campos; `institution` `null` vira texto vazio e,
  quando vem, guardamos o nome.
- `test_saldo_novo_atualiza_o_investimento_existente`: sincroniza, muda o saldo, sincroniza de
  novo: continua uma linha só (mesma `pk`), com o saldo novo.
- `test_investimento_que_sumiu_da_conexao_e_apagado`: o fundo que sumiu do Nubank é apagado; o
  CDB do Nubank e o do Inter continuam.

### Contas puras (`financas/tests/test_guardado.py`), casos 5, 6, 7 e 9

Sem banco: nenhum teste pede a fixture `db`.

- `test_meses_ate_conta_o_mes_atual_e_o_mes_alvo`: outubro a julho = 10; o próprio mês = 1;
  alvo no passado = 0.
- `test_previsto_sem_ter_guardado_no_mes`: 6.300 (caso 5).
- `test_previsto_tendo_guardado_no_mes`: 5.800 (caso 5).
- `test_previsto_com_mes_alvo_que_ja_passou_e_o_total`: previsto = 1.300.
- `test_progresso_arredonda_para_baixo`: 22 e 20 (caso 6).
- `test_progresso_com_previsto_zero_e_none`: sem dinheiro e plano de zero, o progresso é `None`
  em vez de um erro de divisão por zero.
- `test_falta_guardar_no_mes`: faltam 200 com 300 guardados; com 600, falta 0 e não −100
  (caso 7).
- `test_sem_plano_so_total_e_este_mes`: sem plano, ou com só um dos campos, plano, previsto e
  progresso vêm `None` (caso 9).

### Resumo (`financas/tests/test_resumo.py`), casos 3 a 7

Chamam o `resumo_do_mes` direto, com "hoje" fixo em 08/10/2026.

- `test_guardado_total_soma_os_saldos_dos_investimentos`: 1.000 + 300 + resgatado com 0 =
  1.300 (caso 3).
- `test_guardado_este_mes_e_aplicacoes_menos_resgates`: 300 + 200 − 100 = 400. Ficam de fora
  uma aplicação de setembro, uma "aplicação" no cartão, dividendos e a padaria (caso 4).
- `test_guardado_este_mes_segue_o_inicio_do_mes_do_app`: com 2 dias antes, a aplicação de
  30/09 conta em outubro; com 0, não conta (caso 4).
- `test_posso_gastar_desconta_o_que_falta_guardar`: saldo 1.400, faltam 200: (1.400 − 200) ÷ 24
  dias = 50,00 (caso 7).
- `test_posso_gastar_com_o_mes_guardado_nao_desconta`: guardou 600: 1.400 ÷ 24 = 58,33 (caso 7).
- `test_posso_gastar_sem_plano_fica_igual_a_hoje`: 58,33, como antes do módulo (caso 7).
- `test_guardado_com_plano_traz_previsto_e_progresso`: o bloco inteiro pelo resumo: previsto
  5.800 e progresso 22 (casos 5 e 6).

### API (`financas/tests/test_api_resumo.py`), caso 9

- `test_resumo_sem_plano_traz_guardado_com_plano_null`: sem nada, o bloco vem com `"0.00"`,
  `plano` `null` e nada faltando.
- `test_resumo_com_plano_traz_o_bloco_guardado`: o JSON completo, com dinheiro como texto e o
  mês como `"2027-07"`: previsto `"6300.00"`, progresso 20, faltam `"200.00"`.

### Plano de guardar (`planejamento/tests/`), caso 8

A fixture `hoje_10_de_outubro` troca o `timezone.localdate` com `monkeypatch`, para o "mês atual"
ser sempre outubro de 2026, seja qual for o dia em que o teste roda.

- `test_plano_sem_nada_salvo_fica_vazio` e `test_plano_atual_usa_sempre_a_mesma_linha`
  (`test_models.py`): a linha única começa vazia e é sempre a mesma.
- `test_plano_sem_token_responde_401`: sem token, 401.
- `test_get_sem_plano_devolve_os_dois_null` e `test_get_devolve_o_mes_como_aaaa_mm`: o `GET`
  devolve `null` sem plano e `"2027-07"` com plano.
- `test_patch_salva_valor_e_mes`: salva e grava o mês como 01/07/2027.
- `test_patch_com_os_dois_null_remove_o_plano`: os dois `null` tiram o plano.
- `test_patch_so_do_valor_mantem_o_mes`: mudar só o valor mantém o mês.
- `test_patch_recusa_valor_negativo`: 400, mensagem, nada salvo.
- `test_patch_recusa_mes_no_passado` e `test_patch_aceita_o_mes_atual`: setembro é recusado;
  outubro (o mês atual) é aceito.
- `test_mes_atual_e_o_mes_do_app`: com 2 dias antes, em 30/10 outubro já é passado.
- `test_patch_recusa_so_um_dos_dois` e `test_patch_recusa_esvaziar_so_um_dos_dois`: plano pela
  metade recebe 400 em `non_field_errors`, e o que estava salvo continua.
- `test_patch_recusa_mes_em_formato_errado`: `"07/2027"` e `"2027-07-15"` recebem 400 com a
  mensagem do formato.

### Testes antigos ajustados

- `test_resumo_traz_as_chaves_e_dinheiro_como_texto`: a lista de chaves do resumo ganhou
  `"guardado"`.
- A fixture `dados_pluggy` (explicada acima), que agora troca também o `listar_investimentos`.

## 7. Testar à mão

Com o banco no ar (`docker compose up -d`), o `migrate` feito e o `runserver` rodando:

```fish
# Salvar um plano de 500 por mês até julho de 2027
curl -X PATCH -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" \
  -d '{"valor_mensal": "500.00", "mes_alvo": "2027-07"}' http://127.0.0.1:8000/api/plano/

# Ver o bloco "guardado" e o "posso gastar" com o desconto
curl -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/resumo/

# Mês no passado: espera 400 com "O mês alvo não pode ser antes do mês atual."
curl -X PATCH -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" \
  -d '{"mes_alvo": "2026-01"}' http://127.0.0.1:8000/api/plano/

# Tirar o plano
curl -X PATCH -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" \
  -d '{"valor_mensal": null, "mes_alvo": null}' http://127.0.0.1:8000/api/plano/
```

Para ver os investimentos reais: `python manage.py shell` e, dentro dele,
`from financas.services.sincronizacao import sincronizar; sincronizar()`. Depois, conferir em
"Investimentos" no admin se as caixinhas do Nubank apareceram (dúvida 2 dos requisitos).

## 8. Limites e próximos passos

- **Resposta real ainda não vista.** Os campos vêm da documentação da Pluggy. Se um investimento
  vier sem `name` ou `balance`, o `sincronizar()` inteiro falha (ele é tudo ou nada). Conferir no
  primeiro `sincronizar()` de verdade.
- **Mês passado no resumo.** Pedindo `?mes=` de um mês passado, o `este_mes` e o previsto são
  daquele mês, mas o `total` é sempre o de hoje (a Pluggy não dá o saldo antigo).
- **Plano pela metade no admin.** O admin deixa salvar só um dos campos; o resumo trata isso
  como sem plano.
- **Todos os investimentos contam.** Escolher quais entram no "guardado" ficou para depois
  (decisão 1 do plano).
- Próximo: Módulo 5b, a seção "Guardado" na tela Início e a folha "Plano de guardar".
