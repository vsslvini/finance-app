# Testes do cliente da Pluggy

Explicação de `backend/financas/tests/test_pluggy.py` (5 testes), escrita em 2026-10-07.
Os conceitos do pytest usados aqui (fixtures, `monkeypatch`, `pytest.raises`, `settings`)
estão explicados em `docs/estudos/pytest.md`.

O que é `@pytest.fixture` e onde está o `monkeypatch` (que vem com o próprio pytest,
sem `import`): ver `docs/estudos/pytest.md`, seções 3 e 4, e o resumo no começo de
`docs/estudos/testes/test_sincronizacao.md`.

## A ideia geral

O `financas/integracoes/pluggy.py` faz chamadas HTTP de verdade à Pluggy com `requests`. Nos testes,
**não queremos internet**, por três motivos: o teste ficaria lento, dependeria da Pluggy
estar no ar e gastaria nossas chamadas. Então, durante o teste, trocamos o `requests.post`
e o `requests.get` por funções falsas que:

1. **anotam** como foram chamadas (URL, corpo, cabeçalhos), para conferirmos se o nosso
   código pediu certo;
2. **devolvem** uma resposta pronta, para conferirmos se o nosso código lê a resposta certo.

Todos os testes seguem o padrão em 3 blocos: **prepara, executa, confere**.

## As peças de apoio (linhas 9 a 45)

**`RespostaFalsa`:** imita o objeto que o `requests` devolve, mas só com as 3 coisas que o
nosso código usa:

- `status_code`: o código HTTP (200 = deu certo, 401 = não autorizado...);
- `.json()`: devolve os dados (na resposta real, isso converte o texto JSON num dicionário
  Python);
- `.raise_for_status()`: se o status for 400 ou maior, lança um `requests.HTTPError`. A
  resposta real faz exatamente isso, e é assim que o nosso código descobre que deu erro.

**`trocar_post(monkeypatch, resposta)`:**

- cria uma lista vazia `chamadas`;
- define `post_falso`, que guarda na lista um dicionário com a `url` e todos os argumentos
  nomeados (`**argumentos` junta coisas como `json=...` e `timeout=...` num dicionário) e
  devolve a resposta pronta;
- `monkeypatch.setattr("financas.integracoes.pluggy.requests.post", post_falso)` faz a troca. O caminho
  começa em `financas.integracoes.pluggy` porque trocamos o `requests` **que o nosso módulo usa** (ver
  `docs/estudos/pytest.md`, seção 4, "Por que esse caminho"). Quando o teste termina, o
  `monkeypatch` desfaz a troca sozinho;
- devolve a lista, para o teste olhar o que foi anotado.

**`trocar_get(monkeypatch, *respostas)`:** igual, mas aceita várias respostas (`*respostas`
junta todas numa tupla). Cada chamada tira a primeira da fila (`fila.pop(0)`). Serve para
simular a paginação.

Essas duas são **funções ajudantes comuns**, não fixtures: recebem o `monkeypatch` do teste
como argumento (ver `docs/estudos/pytest.md`, seção 3, "Fixture x função ajudante").

## Teste 1: `test_obter_api_key_manda_credenciais_e_devolve_a_chave`

**O que verifica:** para conversar com a Pluggy, primeiro mandamos `clientId` e
`clientSecret` para `POST /auth` e recebemos uma `apiKey` (ver `docs/pluggy.md`).

- **Prepara:**
  - `settings` é uma fixture do pytest-django; mudar `settings.PLUGGY_CLIENT_ID` vale só
    durante este teste. Assim usamos credenciais falsas, e as do `.env` nunca aparecem no
    teste;
  - troca o `post` por um que devolve `{"apiKey": "chave-falsa"}`.
- **Executa:** chama `pluggy.obter_api_key()`.
- **Confere:**
  - a função devolveu a chave que veio na resposta;
  - fez **exatamente 1** chamada;
  - para a URL certa (`https://api.pluggy.ai/auth`);
  - com o corpo JSON certo, lido do `settings` (prova que as credenciais não estão escritas
    no código);
  - com um `timeout`. Sem ele, se a Pluggy não responder, o `requests` espera para sempre e
    o `sincronizar()` trava. `assert chamadas[0]["timeout"]` só confere que existe um valor
    e que ele não é zero nem vazio; não fixa quantos segundos. Se o código esquecer o
    `timeout`, a chave `"timeout"` nem existe no dicionário e o teste quebra com `KeyError`.

## Teste 2: `test_obter_api_key_com_credenciais_recusadas_da_erro`

**O que verifica:** se a Pluggy recusar as credenciais, o erro **tem que aparecer**, e não
pode ser engolido em silêncio.

- **Prepara:** a resposta falsa vem com `status=401`.
- **Executa e confere juntos:** `with pytest.raises(requests.HTTPError):` quer dizer "o
  código aqui dentro **precisa** lançar `HTTPError`". Se lançar, o teste passa; se não
  lançar nada, o teste falha (ver `docs/estudos/pytest.md`, seção 5).

**O que isso obriga o código a fazer:** chamar `resposta.raise_for_status()` antes de ler o
JSON. Sem isso, a função tentaria pegar `"apiKey"` de `{"code": 401, ...}` e daria um
`KeyError` confuso, ou passaria adiante um valor errado. Mesma ideia do aprendizado de
2026-10-03: falhar cedo e com mensagem clara.

## Teste 3: `test_listar_contas_manda_chave_e_item_e_devolve_results`

**O que verifica:** `GET /accounts?itemId=...` lista as contas de uma conexão (o "item" da
Pluggy é a nossa `Conexao`).

- **Prepara:** a resposta falsa imita o formato real da Pluggy: os dados vêm dentro de
  `"results"`, junto com informações de página (`page`, `total`, `totalPages`).
- **Executa:** `pluggy.listar_contas("chave-falsa", "item-1")`. A função recebe a chave
  pronta (não pede uma nova) e o id da conexão.
- **Confere:**
  - devolveu **só a lista** de dentro de `"results"`, sem o envelope de página. Assim, quem
    usa a função (o `sincronizar()`) recebe direto a lista de contas;
  - 1 chamada, para `https://api.pluggy.ai/accounts`;
  - o `itemId` foi em `params`, que o `requests` transforma em `?itemId=item-1` no fim da
    URL;
  - a chave foi no cabeçalho `X-API-KEY`, que é como a Pluggy identifica quem está pedindo;
  - tem `timeout`.

## Teste 4: `test_listar_transacoes_junta_as_duas_paginas`

**O que verifica:** a paginação. Uma conta pode ter muitas transações, e a Pluggy devolve em
pedaços (páginas). A rota `/v2/transactions` usa o campo `"next"`: se ele vier preenchido,
há mais uma página e ele diz como pedi-la; se vier `None`, acabou.

- **Prepara:** duas respostas na fila do `trocar_get`:
  - a primeira traz `t1` e `"next": "?accountId=conta-1&after=abc"`;
  - a segunda traz `t2` e `"next": None`.
- **Executa:** `pluggy.listar_transacoes("chave-falsa", "conta-1")`.
- **Confere:**
  - devolveu as duas páginas **juntas numa lista só**, na ordem: `[t1, t2]`;
  - fez **exatamente 2** chamadas (nem uma a menos, que perderia dados; nem uma a mais, que
    tentaria pegar uma página que não existe);
  - a primeira foi para `/v2/transactions` com `params={"accountId": "conta-1"}`;
  - a segunda foi para `/v2/transactions` + o texto do `"next"`, **sem** `params`. O `"next"`
    já traz o `accountId`; se mandássemos `params` de novo, o `accountId` iria duas vezes na
    URL. `chamadas[1].get("params") is None` aceita tanto "não passou `params`" quanto
    "passou `params=None`";
  - a chave foi nas duas chamadas (cada pedido HTTP é independente; a Pluggy não "lembra" de
    quem pediu antes).

## Teste 5: `test_listar_transacoes_com_uma_pagina_so`

**O que verifica:** o caso comum, em que tudo cabe numa página. O `"next"` já vem `None` na
primeira resposta.

- **Confere:** devolveu `[t1]` e fez **só 1** chamada.

**Por que existe, se o teste 4 já cobre a paginação:** ele pega um erro diferente. Um código
que sempre pedisse "mais uma página" passaria no teste 4 por sorte, mas aqui faria uma
segunda chamada. Como a fila do `trocar_get` só tem uma resposta, o `fila.pop(0)` da segunda
chamada daria `IndexError` e o teste quebraria. É o teste que garante que o laço sabe
**parar**.
