# pytest no projeto

Guia de estudo do que o backend usa do pytest e do pytest-django. Os exemplos vêm
dos nossos testes (`backend/financas/tests/`). Links conferidos em 2026-10-06.

Versões: pytest 9.1.1 e pytest-django 4.14.0 (ver `backend/requirements-dev.txt`).

## 1. Como o pytest acha os testes

Fonte: https://docs.pytest.org/en/stable/explanation/goodpractices.html#conventions-for-python-test-discovery (conferido em 2026-10-06).

Quando você roda `pytest` dentro de `backend/`, ele:

1. Entra nas pastas a partir da pasta atual.
2. Procura arquivos com nome `test_*.py` (no nosso `pyproject.toml` deixamos só esse padrão, com `python_files = ["test_*.py"]`).
3. Dentro de cada arquivo, roda as funções cujo nome começa com `test`.

Por isso `test_pluggy.py` é encontrado, a função `test_listar_transacoes_com_uma_pagina_so` vira um teste e a função `trocar_get` (que não começa com `test`) é só um ajudante.

A configuração fica em `backend/pyproject.toml`:

```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings"
python_files = ["test_*.py"]
```

`DJANGO_SETTINGS_MODULE` é lido pelo pytest-django, para saber qual `settings.py` carregar antes dos testes.
Fonte: https://pytest-django.readthedocs.io/en/latest/configuring_django.html (conferido em 2026-10-06; a página mostra a forma nova `[tool.pytest]`, e a nossa `[tool.pytest.ini_options]` também é aceita).

## 2. `assert` simples

Fonte: https://docs.pytest.org/en/stable/how-to/assert.html#asserting-with-the-assert-statement (conferido em 2026-10-06).

No pytest, a verificação é o `assert` do próprio Python. Se a expressão for falsa, o teste falha, e o pytest mostra os dois lados da comparação.

```python
assert api_key == "chave-falsa"
assert len(chamadas) == 1
```

## 3. Fixtures

Fonte: https://docs.pytest.org/en/stable/how-to/fixtures.html#requesting-fixtures (conferido em 2026-10-06).

Fixture é uma função que prepara algo que o teste precisa (um objeto no banco, dados falsos). Ela é marcada com `@pytest.fixture`, e o teste a recebe **pelo nome do parâmetro**: o pytest olha os parâmetros do teste, acha a fixture com o mesmo nome, roda e entrega o resultado.

### Primeiro: o que é o `@` (decorador)

O `@` em cima de uma função é um recurso do **Python**, não do pytest. Ele se chama **decorador** e é só um atalho. Estas duas formas fazem a mesma coisa:

```python
# Forma com @
@pytest.fixture
def conexao(db):
    ...

# Forma sem @ (equivalente)
def conexao(db):
    ...
conexao = pytest.fixture(conexao)
```

Ou seja: o Python cria a função `conexao` e, logo em seguida, entrega essa função para `pytest.fixture`, que devolve uma versão "marcada" dela. A função continua com o mesmo código; o que muda é que agora o pytest sabe que ela é uma fixture.

Uma comparação: é como colar uma etiqueta "fixture" na função. Sem a etiqueta, `conexao` seria uma função qualquer, e o pytest não daria atenção a ela.

O `@pytest.mark.django_db` que aparece em cima dos testes é outro decorador, com outra etiqueta: "este teste pode usar o banco" (seção 6).

### Passo a passo: o que o pytest faz com uma fixture

Pegue este pedaço do `test_sincronizacao.py`:

```python
@pytest.fixture
def conexao(db):
    return Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")


@pytest.mark.django_db
def test_ultima_atualizacao_preenchida_ao_terminar(conexao, dados_pluggy):
    sincronizar()
    conexao.refresh_from_db()
    assert conexao.ultima_atualizacao is not None
```

Quando você roda `pytest`:

1. **Coleta:** o pytest abre o arquivo e anota duas listas: as funções com etiqueta de fixture (`conexao`, `dados_pluggy`) e as funções de teste (as que começam com `test`). Nada roda ainda.
2. **Hora de rodar o teste:** o pytest lê os **nomes dos parâmetros** do teste: `conexao` e `dados_pluggy`.
3. **Procura pelo nome:** para cada parâmetro, ele procura uma fixture com aquele nome exato. Acha `conexao` neste arquivo. (Se não achasse em lugar nenhum, o teste daria erro `fixture 'conexao' not found`.)
4. **A fixture também tem parâmetros:** `conexao` pede `db`. O pytest faz o mesmo processo para ela: acha a fixture `db` (do pytest-django), roda primeiro, e só depois roda `conexao`.
5. **Roda a fixture e guarda o resultado:** `conexao` cria a linha no banco e faz `return` dela.
6. **Chama o teste passando os resultados:** é como se o pytest fizesse `test_ultima_atualizacao_preenchida_ao_terminar(conexao=<a Conexao criada>, dados_pluggy=<o dicionário>)`.
7. **Fim do teste:** o pytest faz a limpeza das fixtures que têm limpeza (veja `yield` abaixo).

O ponto principal: **você nunca chama uma fixture com parênteses.** Não existe `conexao()` dentro do teste. Basta escrever o nome como parâmetro, e o pytest chama por você. Por isso o `monkeypatch` aparece nos testes sem nenhum `import`: ele só é pedido pelo nome.

Cada teste recebe uma fixture nova; o que um teste muda não passa para o próximo.

### Fixture com `yield`: preparar e depois limpar

Algumas fixtures precisam desfazer o que fizeram quando o teste acaba. Para isso, em vez de `return`, usam `yield`:

```python
@fixture
def monkeypatch():
    mpatch = MonkeyPatch()
    yield mpatch      # entrega para o teste e PAUSA aqui
    mpatch.undo()     # roda só depois que o teste termina
```

Esse é o código real da fixture `monkeypatch`, copiado do pytest instalado no nosso `.venv` (seção 4). Funciona assim:

1. o pytest roda a fixture até o `yield`;
2. entrega o valor do `yield` para o teste;
3. roda o teste inteiro (passando ou falhando);
4. volta para a fixture e roda o que vem depois do `yield` (aqui, `undo()`, que desfaz todas as trocas).

As nossas fixtures (`conexao` e `dados_pluggy`) usam `return`, porque não precisam limpar nada: o banco já é desfeito pelo pytest-django, e as trocas são desfeitas pelo `monkeypatch` que a `dados_pluggy` pediu.

Fonte do `yield`: https://docs.pytest.org/en/stable/how-to/fixtures.html#yield-fixtures-recommended (conferido em 2026-10-07).

### De onde vêm as fixtures que usamos

| Fixture | Quem fornece | Onde está |
|---|---|---|
| `conexao`, `dados_pluggy` | nós | `backend/financas/tests/test_sincronizacao.py` |
| `monkeypatch` | o próprio pytest | `backend/.venv/lib/python3.14/site-packages/_pytest/monkeypatch.py` |
| `db`, `settings` | o pytest-django | `backend/.venv/lib/python3.14/site-packages/pytest_django/fixtures.py` |

O pytest já conhece as fixtures dele e as dos plugins instalados (o pytest-django é um plugin). Para ver todas as fixtures disponíveis, rode `pytest --fixtures` dentro de `backend/`.

### Fixture usando outra fixture

Fonte: https://docs.pytest.org/en/stable/how-to/fixtures.html#fixtures-can-request-other-fixtures (conferido em 2026-10-06).

Uma fixture pode pedir outra do mesmo jeito, pelo parâmetro. A nossa `conexao` pede `db` (do pytest-django, seção 6), e a `dados_pluggy` pede `monkeypatch` (seção 4).

### Fixture x função ajudante

Nem tudo precisa ser fixture. `conta_pluggy(**campos)` e `transacao_pluggy(**campos)` são funções comuns: o teste chama quando quer e troca só os campos que importam, por exemplo `transacao_pluggy(amount=12.3, type="CREDIT")`.

## 4. `monkeypatch`

Fonte: https://docs.pytest.org/en/stable/how-to/monkeypatch.html (conferido em 2026-10-06).

`monkeypatch` é uma fixture do próprio pytest que troca, só durante o teste, um atributo de um módulo ou objeto. A documentação garante que todas as trocas são desfeitas sozinhas quando o teste termina, então um teste não "suja" o outro.

### Onde ele está

- **Ele vem com o pytest.** Não é dependência nova nem código nosso. O código fica em `backend/.venv/lib/python3.14/site-packages/_pytest/monkeypatch.py`: a fixture está na função `monkeypatch()` (perto da linha 36) e o trabalho de verdade fica na classe `MonkeyPatch` do mesmo arquivo.
- **Não precisa de `import`.** Como toda fixture, ele chega ao teste pelo nome do parâmetro (seção 3): `def test_algo(monkeypatch):`.
- **Ele é uma fixture com `yield`** (seção 3): entrega um objeto `MonkeyPatch` para o teste e, quando o teste acaba, chama `undo()`, que coloca de volta tudo o que foi trocado.

### O que ele faz, numa imagem

Pense no módulo `financas.integracoes.pluggy` como uma gaveta com etiquetas: a etiqueta `obter_api_key` aponta para a função de verdade. O `monkeypatch.setattr(...)`:

1. anota para onde a etiqueta apontava;
2. faz a etiqueta apontar para a nossa função falsa;
3. no fim do teste (`undo()`), faz a etiqueta voltar para onde apontava.

Durante o teste, qualquer código que procurar `pluggy.obter_api_key` encontra a falsa. É por isso que o nome do recurso é "monkey patch" ("remendo de macaco"): um remendo feito com o programa já rodando, sem mudar o arquivo do código.

Usamos para que nenhum teste acesse a internet:

```python
monkeypatch.setattr("financas.integracoes.pluggy.requests.get", get_falso)
```

O texto é um caminho: o pytest importa `financas.integracoes.pluggy`, pega o que esse módulo chama de `requests` (o módulo `requests` inteiro) e troca o `get` dele por `get_falso`.

### Por que esse caminho

A regra da documentação é: troque o nome **no lugar onde o código procura por ele**.

- O `financas/integracoes/pluggy.py` vai fazer `import requests` e chamar `requests.get(...)`. A busca por `get` acontece dentro do módulo `requests` na hora da chamada, então trocar `financas.integracoes.pluggy.requests.get` funciona. Escrever o caminho a partir de `financas.integracoes.pluggy` deixa claro qual código estamos isolando.
- Se o `pluggy.py` fizesse `from requests import get`, ele guardaria uma cópia do nome `get` dentro dele, e teríamos que trocar `financas.integracoes.pluggy.get`.
- No `test_sincronizacao.py` trocamos `financas.integracoes.pluggy.obter_api_key` (e as outras duas). Isso só funciona porque o `sincronizacao.py` faz `from financas.integracoes import pluggy` e chama `pluggy.obter_api_key()`: a busca acontece no módulo `pluggy`, que é exatamente o que trocamos. Com `from financas.integracoes.pluggy import obter_api_key`, a troca não teria efeito e o teste chamaria a Pluggy de verdade.

As funções falsas guardam os argumentos recebidos numa lista (`chamadas`), e o teste confere essa lista depois:

```python
def get_falso(url, **argumentos):
    chamadas.append({"url": url, **argumentos})
    return fila.pop(0)
```

## 5. `pytest.raises`

Fonte: https://docs.pytest.org/en/stable/how-to/assert.html#assertions-about-expected-exceptions (conferido em 2026-10-06).

Verifica que um erro **acontece**. O teste passa se o bloco `with` levantar o erro indicado, e falha se não levantar nada.

```python
with pytest.raises(requests.HTTPError):
    pluggy.obter_api_key()
```

O código depois do `with` continua rodando, por isso em `test_erro_no_meio_nao_salva_nada` dá para conferir, logo em seguida, que nada ficou salvo no banco.

## 6. pytest-django: `db`, `@pytest.mark.django_db` e `settings`

Fontes: https://pytest-django.readthedocs.io/en/latest/helpers.html e https://pytest-django.readthedocs.io/en/latest/database.html (conferidos em 2026-10-06).

### Acesso ao banco

Por padrão o pytest-django **bloqueia** o banco: um teste que tenta ler ou gravar sem pedir permissão falha. Há duas formas de pedir:

- o marcador `@pytest.mark.django_db` em cima do teste (https://pytest-django.readthedocs.io/en/latest/helpers.html#pytest.mark.django_db);
- a fixture `db` (https://pytest-django.readthedocs.io/en/latest/helpers.html#std-fixture-db), que usamos dentro da fixture `conexao`.

Como funciona:

- O **banco de teste** (separado do banco de desenvolvimento) é criado **uma vez**, quando o primeiro teste precisa dele, e reaproveitado pelos outros. No fim da rodada ele é apagado.
- **Cada teste roda dentro de uma transação que é desfeita (rollback) no fim.** Por isso cada teste começa com o banco vazio, mesmo que o anterior tenha criado contas.

### `settings`

Fixture que dá acesso às configurações do Django e **desfaz sozinha** qualquer mudança no fim do teste (seção "settings" de https://pytest-django.readthedocs.io/en/latest/helpers.html). Usamos para trocar as credenciais da Pluggy por valores falsos:

```python
def test_obter_api_key_manda_credenciais_e_devolve_a_chave(monkeypatch, settings):
    settings.PLUGGY_CLIENT_ID = "id-falso"
    settings.PLUGGY_CLIENT_SECRET = "segredo-falso"
```

Assim o teste não depende do `.env` real e nunca usa a chave de verdade.

## 7. Comandos que usamos

Fonte: https://docs.pytest.org/en/stable/how-to/usage.html#specifying-which-tests-to-run (conferido em 2026-10-06).

Sempre dentro de `backend/`, com o ambiente virtual ativado e o banco do Docker no ar:

| Comando | O que faz |
|---|---|
| `pytest` | roda todos os testes |
| `pytest -v` | mostra o nome de cada teste e se passou (`PASSED`) ou falhou (`FAILED`) |
| `pytest --co` | só lista os testes encontrados, sem rodar (`--co` é a forma curta de `--collect-only`) |
| `pytest financas/tests/test_pluggy.py` | roda só um arquivo |
| `pytest financas/tests/test_pluggy.py::test_listar_transacoes_com_uma_pagina_so` | roda um teste só |
| `pytest -k transacao` | roda os testes cujo nome contém "transacao" (aceita `and`, `or` e `not`, ex.: `-k "transacao and not manual"`) |
