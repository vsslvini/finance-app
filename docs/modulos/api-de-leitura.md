# Módulo 1: API de leitura

Escrito em 2026-10-08. Este é o passo 4 da arquitetura (`docs/arquitetura.md`, seção 5).
Até aqui o backend sabia buscar os dados na Pluggy e guardar no PostgreSQL, mas não
tinha como entregar esses dados a ninguém. Este módulo cria a "porta de entrada" que o
app do celular vai usar.

- [Módulo 1: API de leitura](#módulo-1-api-de-leitura)
  - [1. O que o módulo entrega](#1-o-que-o-módulo-entrega)
  - [2. Conceitos antes do código](#2-conceitos-antes-do-código)
  - [3. O caminho de uma requisição, do começo ao fim](#3-o-caminho-de-uma-requisição-do-começo-ao-fim)
  - [4. Arquivo por arquivo](#4-arquivo-por-arquivo)
  - [5. Os testes, um por um](#5-os-testes-um-por-um)
  - [6. Testar à mão](#6-testar-à-mão)
  - [7. Decisões, limites e o que ficou para depois](#7-decisões-limites-e-o-que-ficou-para-depois)
  - [8. Para estudar mais](#8-para-estudar-mais)

## 1. O que o módulo entrega

| Rota | O que faz | Requisitos |
|---|---|---|
| `GET /api/contas/` | lista as contas (corrente e cartão) com saldo, limites e datas | RF01, RF02, RF11, RF12 |
| `GET /api/transacoes/?mes=2026-10` | lista as transações do mês, da mais nova para a mais antiga | RF05, RF06, RF07 |
| `POST /api/sincronizar/` | busca dados novos na Pluggy e diz quando foi a última atualização | RF24 |
| (todas acima) | só respondem a quem mandar um token válido | RNF03 |

A `GET /api/health/` continua pública, para conferir se o backend está vivo.

Números: 23 testes novos (9 de contas, 9 de transações, 5 de sincronizar); o backend
inteiro tem 52 testes, todos passando, e o lint passa.

## 2. Conceitos antes do código

### O que é uma API, aqui

O app do celular não lê o PostgreSQL direto (seria inseguro e acoplado). Ele faz pedidos
HTTP ao backend, como um navegador faz a um site, e recebe **JSON** (texto com chaves e
valores, parecido com um dicionário do Python). Cada endereço (`/api/contas/`) com um
método (`GET`, `POST`) é uma **rota**.

- `GET`: "me mostre algo". Não muda nada no servidor.
- `POST`: "faça algo". Pode mudar dados (o sincronizar grava no banco).

### Códigos de status que aparecem neste módulo

Toda resposta HTTP vem com um número que diz como foi. O app olha esse número antes de
ler o JSON.

| Código | Nome | Quando aparece aqui |
|---|---|---|
| `200` | OK | deu certo |
| `400` | Bad Request | o pedido veio errado (ex.: `?mes=abc`) |
| `401` | Unauthorized | faltou o token, ou o token não existe |
| `405` | Method Not Allowed | método errado (ex.: `GET` no sincronizar, que só aceita `POST`) |
| `502` | Bad Gateway | o nosso backend está bem, mas o serviço de fora (Pluggy) falhou |

Regra prática: começa com 4, o erro é de quem pediu; começa com 5, o erro é do servidor
ou de algo atrás dele.

### Token

Um **token** é uma senha longa e aleatória (40 caracteres) que identifica um usuário. O
app manda o token em todo pedido, num cabeçalho (uma linha extra do pedido HTTP):

```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

O DRF já traz isso pronto no app `rest_framework.authtoken`: uma tabela no banco que liga
cada token a um usuário, e uma classe (`TokenAuthentication`) que lê o cabeçalho e
procura o token na tabela. Não é dependência nova; vem dentro do DRF.

Por que token e não usuário e senha? Porque o app guarda uma coisa só, que pode ser
trocada a qualquer momento (`drf_create_token -r`) sem mudar a senha do admin. E, se
vazar, o token abre só a nossa API: as chaves da Pluggy nunca saem do backend (RNF01).

### Serializer

O banco devolve objetos Python (`Conta`, `Transacao`). O app precisa de JSON. O
**serializer** é o tradutor entre os dois: diz quais campos vão para o JSON e de onde
vem cada um. O `ModelSerializer` do DRF lê o model e monta quase tudo sozinho; nós só
dizemos a lista de campos e os campos "emprestados" de outras tabelas (como o nome do
banco, que mora na `Conexao`).

Um detalhe importante: o serializer transforma `Decimal("1234.56")` no **texto**
`"1234.56"`, e não no número `1234.56`. Números com vírgula no JSON viram `float` em
muitas linguagens (inclusive JavaScript), e `float` erra centavos (`0.1 + 0.2` dá
`0.30000000000000004`). Texto chega exato, e o app converte só para mostrar (RNF04). O
DRF faz isso por padrão (configuração `COERCE_DECIMAL_TO_STRING`, que vem `True`).

### View genérica (`ListAPIView`)

A **view** é a função ou classe que recebe o pedido e devolve a resposta. Para "listar
coisas do banco", o DRF tem uma view pronta, a `ListAPIView`: você diz **quais linhas**
(`queryset` ou `get_queryset`) e **qual serializer**, e ela faz o resto (busca, traduz,
responde 200 com a lista). Por isso `ContasView` tem só duas linhas de verdade.

## 3. O caminho de uma requisição, do começo ao fim

Exemplo: o app pede `GET /api/transacoes/?mes=2026-10` com o token.

```
App ──HTTP──► config/urls.py ──► financas/urls.py ──► TransacoesView
                                                          │
                     1. TokenAuthentication lê o cabeçalho│
                     2. IsAuthenticated confere o usuário │
                     3. get_queryset() ─► ler_mes("2026-10")
                                       └► Transacao.objects... (PostgreSQL)
                     4. TransacaoSerializer ─► lista de dicionários
                     5. Response ─► JSON ─────────────────┘──► App
```

1. **Endereço.** O Django compara o caminho com `config/urls.py`. A linha
   `path("api/", include("financas.urls"))` corta o `api/` e passa o resto
   (`transacoes/`) para `financas/urls.py`, que aponta para `TransacoesView`. A parte
   `?mes=2026-10` não entra nessa comparação; ela fica guardada em
   `request.query_params`.
2. **Quem é você?** Antes de rodar qualquer linha da view, o DRF chama a classe de
   autenticação configurada em `settings.py` (`TokenAuthentication`). Ela lê o
   cabeçalho `Authorization`:
   - sem cabeçalho: segue como "anônimo";
   - com token que não existe na tabela: para tudo e responde **401** ("Token inválido");
   - com token válido: o usuário dono do token vira `request.user`.
3. **Você pode entrar?** Depois, o DRF chama a permissão configurada
   (`IsAuthenticated`). Anônimo não passa: **401**. É por isso que nenhuma rota
   precisa repetir "exija token": o padrão vale para todas.
4. **O método existe?** Só agora o DRF procura o método do pedido na view (`get`,
   `post`). Se não existir, **405**. Por isso um `GET` sem token no sincronizar dá 401, e
   com token dá 405: a porta é conferida antes do método.
5. **Buscar os dados.** A `ListAPIView` chama `get_queryset()`. Ele lê o mês com
   `ler_mes()` (que pode responder **400**, ver seção 4) e monta a consulta: filtra pelo
   ano e mês, ordena da mais nova para a mais antiga e já traz conta e conexão juntas
   (`select_related`).
6. **Traduzir.** A view passa cada `Transacao` pelo `TransacaoSerializer`, que monta um
   dicionário com os 10 campos combinados.
7. **Responder.** O DRF transforma a lista de dicionários em JSON e devolve com **200**.

O `POST /api/sincronizar/` segue os passos 1 a 4 igual, e no lugar dos passos 5 e 6 chama
o service `sincronizar()` (o mesmo que você roda pelo shell) e depois consulta o horário
da última atualização.

## 4. Arquivo por arquivo

### `backend/config/settings.py` (alterado)

- `"rest_framework.authtoken"` em `INSTALLED_APPS`: liga o app de tokens do DRF. Ele
  traz uma **migration** própria (cria a tabela `authtoken_token`), por isso é preciso
  rodar `migrate` uma vez (seção 6).
- Bloco `REST_FRAMEWORK`:
  - `DEFAULT_AUTHENTICATION_CLASSES = [TokenAuthentication]`: como descobrir quem está
    pedindo (passo 2 do fluxo).
  - `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`: quem pode entrar (passo 3).
  - Por que "fechado por padrão": uma rota nova esquecida nasce protegida. O erro
    possível vira "não consigo acessar" (fácil de notar), e não "qualquer um acessa"
    (difícil de notar).

### `backend/core/views.py` (alterado)

A `health` ganhou `@permission_classes([AllowAny])`. Como agora tudo exige token, a
`health` precisava de uma exceção explícita para continuar pública. A ordem dos
decoradores importa: `@api_view` em cima, `@permission_classes` embaixo (a documentação
do DRF pede assim). O teste antigo dela (`core/tests/test_health.py`, que chama sem
token) continuou passando sem mudança, e é ele quem garante que a exceção existe.

### `backend/config/urls.py` (alterado)

Uma linha: `path("api/", include("financas.urls"))`. O Django aceita dois `include` com o
mesmo prefixo `api/`; ele tenta o primeiro (`core`) e, se nenhuma rota casar, tenta o
segundo (`financas`). Segue a decisão de 2026-10-03: cada app tem seu `urls.py`.

### `backend/financas/urls.py` (novo)

Liga os três caminhos às três views. O `.as_view()` aparece nas classes (`ContasView`,
`TransacoesView`) porque o Django espera uma função; `as_view()` transforma a classe em
uma. O `sincronizar` já é função, então entra direto. O `name=` serve para achar a rota
pelo nome no futuro (com `reverse`), sem repetir o endereço.

### `backend/financas/serializers.py` (novo)

- `ContaSerializer`:
  - `fields` é uma **lista fechada** (uma tupla): só sai o que está escrito. O
    `id_pluggy` fica de fora de propósito: é um detalhe interno do backend, e o app não
    precisa dele. Com `fields = "__all__"` ele sairia, e qualquer campo novo no model
    também, sem ninguém decidir.
  - `nome_banco = CharField(source="conexao.nome_banco")`: o `source` diz "siga a
    ligação `conta.conexao` e pegue o `nome_banco`". O ponto funciona como no Python
    (`conta.conexao.nome_banco`). `read_only=True` porque esse campo só sai, nunca entra.
- `TransacaoSerializer`:
  - `nome_conta` e `nome_banco`: o mesmo truque do `source`, um e dois "pulos" de
    distância (`conta.nome` e `conta.conexao.nome_banco`).
  - `categoria = CharField(source="categoria_exibida")`: o `source` também aceita uma
    `@property` do model. Assim a regra "manual, senão Pluggy, senão 'Sem categoria'"
    mora num lugar só (o model), e a API só mostra o resultado.
  - `conta`: é uma `ForeignKey`, e o `ModelSerializer` a mostra como o **id** da conta.
    Serve para o app ligar a transação à conta da lista de contas.
- Por que tuplas `( )` e não listas `[ ]`: o lint (regra `RUF012` do ruff) avisa que uma
  lista num atributo de classe pode ser alterada sem querer e afetar todo mundo que usa
  a classe. A tupla não pode ser alterada. O `admin.py` já usava tuplas.

### `backend/financas/views.py` (novo)

- `ContasView`: `queryset` com `select_related("conexao")` e
  `order_by("conexao__nome_banco", "nome")`.
  - `select_related`: sem ele, o Django faria 1 consulta para as contas e mais 1 para
    cada conta, só para ler o nome do banco (com 7 contas, 8 consultas). Com ele, faz
    **uma** consulta com `JOIN`. Esse problema tem nome: "N+1 consultas".
  - `conexao__nome_banco`: os dois sublinhados (`__`) são o jeito do Django de "seguir a
    ligação" dentro de uma consulta (o equivalente ao ponto do `source`).
- `ler_mes(texto)`:
  - sem `?mes=` (`texto is None`): devolve `timezone.localdate()`, a data de hoje no fuso
    do `settings.py` (`America/Manaus`). Usar `date.today()` pegaria o fuso do
    computador, que pode ser outro num servidor.
  - com `?mes=`: `texto.split("-")` separa `"2026-10"` em `["2026", "10"]`, e
    `date(int(ano), int(mes), 1)` monta o dia 1 daquele mês. Tudo que for inválido cai em
    `ValueError`: `"abc"` (o `split` dá um pedaço só e não cabe em `ano, mes`),
    `"2026-10-05"` (três pedaços), `"2026-xx"` (o `int` falha) e `"2026-13"` (o `date`
    recusa mês 13).
  - no `except`, `raise ValidationError({"detail": MES_INVALIDO})`: o DRF captura essa
    exceção em qualquer ponto da view e a transforma numa resposta **400** com aquele
    JSON. Não precisamos montar a resposta à mão.
  - Por que não `datetime.strptime(texto, "%Y-%m")`: foi a primeira versão do agente,
    mas o ruff (regra `DTZ007`) reclama de horário criado sem fuso. A versão com `split`
    é mais simples e não cria horário nenhum.
- `TransacoesView.get_queryset()`: é um método (e não um atributo `queryset` fixo, como
  nas contas) porque depende do pedido: o mês muda a cada chamada.
  - `filter(data__year=..., data__month=...)`: "o ano da data é tal e o mês é tal".
  - `order_by("-data", "-id")`: o `-` inverte a ordem (mais nova primeiro). O `-id`
    desempata transações do mesmo dia: a criada por último vem antes. Sem desempate, o
    PostgreSQL pode devolver o mesmo dia em ordens diferentes a cada vez.
- `sincronizar(request)`, com `@api_view(["POST"])`:
  - `@api_view(["POST"])` transforma a função numa view do DRF que só aceita `POST`
    (outro método: 405).
  - Chama `sincronizacao.sincronizar()`. O import é do **módulo**
    (`from financas.services import sincronizacao`), não da função. Assim os testes
    conseguem trocar a função com `monkeypatch` no lugar onde ela mora (ver seção 5).
  - `except requests.RequestException`: é a "família" de todos os erros do `requests`
    (sem internet, tempo esgotado, e o `raise_for_status()` do nosso cliente quando a
    Pluggy responde 4xx ou 5xx). Nesse caso, **502** com mensagem em português, para o
    app conseguir avisar "a Pluggy não respondeu", em vez de um 500 genérico. Como o
    `sincronizar()` roda dentro de `transaction.atomic()`, uma falha no meio não deixa
    o banco pela metade.
  - `aggregate(ultima=Max("ultima_atualizacao"))`: pede ao banco o maior valor da
    coluna, numa consulta só. Sem conexões (ou todas vazias), o resultado é `None`, que
    vira `null` no JSON.
  - É uma função (e não uma `ListAPIView`) porque não lista nada: faz uma ação e
    devolve um resultado. É também a única view que chama service, porque é a única com
    regra de negócio.

### `backend/financas/tests/conftest.py` (novo)

Guarda a fixture `cliente_com_token`, usada pelos três arquivos de teste. Ela cria um
usuário, cria um token para ele e devolve um `APIClient` que já manda o cabeçalho
`Authorization` em todo pedido. O `conftest.py` é um arquivo especial do pytest: as
fixtures dele valem para a pasta inteira, sem `import`. Explicação completa em
`docs/pytest.md`, seção 3, "`conftest.py`: fixtures para a pasta inteira".

A fixture pede `db` (do pytest-django) porque cria linhas no banco. Por isso os testes
que usam `cliente_com_token` não precisam de `@pytest.mark.django_db`; só os testes sem
token (que não usam a fixture) precisam da marca.

## 5. Os testes, um por um

Todos seguem o mesmo desenho dos testes antigos: **prepara** (cria dados), **executa**
(faz o pedido com o `APIClient`), **confere** (`assert`). O `APIClient` é um "app falso"
do DRF: faz pedidos HTTP direto ao Django, sem servidor rodando e sem rede.

Cada teste roda num banco de teste vazio, que o pytest-django desfaz no fim. Um teste
nunca vê o que o outro criou.

### `financas/tests/test_api_contas.py` (9 testes)

Ajudantes do arquivo:

- fixture `nubank`: cria uma `Conexao` do Nubank;
- função `criar_conta(conexao, **campos)`: cria uma conta corrente com valores padrão,
  e cada teste troca só o que importa (ex.: `criar_conta(nubank, saldo=...)`).

| Teste | Prepara | Confere | Por que existe |
|---|---|---|---|
| `test_contas_sem_token_responde_401` | `APIClient()` sem credenciais | status 401 | garante que a API não abre sem token |
| `test_contas_com_token_inventado_responde_401` | cabeçalho com `Token token-inventado` | status 401 | um token qualquer não pode passar; precisa existir na tabela |
| `test_contas_com_token_valido_responde_200` | `cliente_com_token` | status 200 | o caminho feliz da autenticação |
| `test_contas_banco_vazio_devolve_lista_vazia` | nada | JSON `[]` | sem contas, a resposta é uma lista vazia, e não erro |
| `test_conta_corrente_traz_os_campos_e_nulos_do_cartao` | 1 conta corrente | o JSON **inteiro** da conta | comparar tudo garante os campos exatos: nenhum a mais, nenhum a menos, e os do cartão `None` (que é `null` no JSON) |
| `test_cartao_traz_limites_e_datas` | 2 cartões, um sem `data_fechamento` | limites como texto, datas como `"AAAA-MM-DD"`, e `None` no fechamento que faltou | é exatamente o caso real da Pluggy (o fechamento não vem) |
| `test_saldo_volta_como_texto` | saldo `Decimal("1234.56")` | `"1234.56"` (texto) | protege o RNF04 se alguém mudar a configuração do DRF |
| `test_contas_ordenadas_por_banco_e_depois_por_nome` | 3 contas criadas **fora de ordem** | Inter (Cartão, Conta), depois Nubank | criar fora de ordem evita que o teste passe só porque o banco devolveu na ordem de criação |
| `test_id_pluggy_nao_aparece_na_resposta` | conta com `id_pluggy` | a chave `"id_pluggy"` não está no JSON | garante a lista fechada de campos |

Um detalhe do teste do cartão: `black, roxinho = resposta.json()` "desempacota" a lista
de dois itens em duas variáveis. A ordem é garantida pela ordenação por nome ("Black"
vem antes de "Roxinho").

### `financas/tests/test_api_transacoes.py` (9 testes)

Ajudantes: fixture `conta` (uma conta corrente do Nubank) e função
`criar_transacao(conta, **campos)` (padrão: 05/10/2026, "Padaria", `-10.00`).

| Teste | Prepara | Confere | Por que existe |
|---|---|---|---|
| `test_transacoes_sem_token_responde_401` | sem credenciais | 401 | proteção |
| `test_filtra_so_o_mes_pedido` | 30/09, 01/10, 31/10 e 01/11 | só as duas de outubro | testa as **bordas**: o último dia do mês anterior, o primeiro e o último do mês, e o primeiro do seguinte. Erros de filtro de data quase sempre acontecem nas bordas |
| `test_sem_mes_usa_o_mes_atual` | uma de hoje e uma de 15/01/2000 | só a de hoje | sem `?mes=`, vale o mês atual. A data de 2000 nunca cai no mês de hoje, então o teste funciona em qualquer dia em que for rodado |
| `test_mes_invalido_responde_400_com_mensagem` | nada | `"2026-13"` e `"abc"` dão 400 com a mensagem exata | o app recebe uma explicação, e não um erro 500. O `for` roda as mesmas conferências para os dois textos |
| `test_transacao_traz_os_campos_combinados` | 1 transação com categoria e parcela 3 de 10 | o JSON inteiro | os 10 campos exatos, o valor negativo como texto (`"-350.90"`) e a data como `"2026-10-05"` |
| `test_categoria_manual_vence_a_da_pluggy` | as duas categorias | `"Mercado"` (a manual) | regra do RF08: o que você escolheu à mão vence |
| `test_categoria_usa_a_da_pluggy_sem_manual` | só a da Pluggy | `"Alimentação"` | o caso mais comum |
| `test_sem_nenhuma_categoria_vem_sem_categoria` | nenhuma | `"Sem categoria"` | as 5 transações reais que vieram sem categoria |
| `test_transacoes_mais_novas_primeiro` | dia 5, dia 10, dia 5 de novo | dia 10, o segundo dia 5, o primeiro dia 5 | confere a ordem e o desempate por id |

Os três testes de categoria parecem repetir o teste da `categoria_exibida` dos models,
mas a pergunta é outra: lá, "a regra está certa?"; aqui, "a API usa a regra?". Se alguém
trocar o `source` do serializer para `categoria_pluggy`, só estes testes quebram.

### `financas/tests/test_api_sincronizar.py` (5 testes)

Nenhum destes testes chama a Pluggy de verdade. A fixture `sincronizar_falso` usa o
`monkeypatch` para trocar `financas.services.sincronizacao.sincronizar` por uma função
que só anota `"chamou"` numa lista, e devolve essa lista ao teste. Assim o teste sabe
**se** e **quantas vezes** o service foi chamado.

Por que trocar em `financas.services.sincronizacao` e não em `financas.views`: a view
chama `sincronizacao.sincronizar()`, ou seja, ela procura a função **dentro do módulo
`sincronizacao` na hora da chamada**. Trocando lá, a view encontra a falsa. Se a view
tivesse feito `from financas.services.sincronizacao import sincronizar`, ela teria uma
cópia do nome, e a troca no módulo não chegaria até ela (`docs/pytest.md`, seção 4,
"Por que esse caminho").

| Teste | Prepara | Confere | Por que existe |
|---|---|---|---|
| `test_sincronizar_sem_token_responde_401` | sem credenciais | 401 **e** lista vazia | além de recusar, garante que a Pluggy nem foi chamada |
| `test_sincronizar_com_get_responde_405` | `GET` com token | 405 e lista vazia | sincronizar muda dados, então só `POST`. Isso evita, por exemplo, que um navegador ou um pré-carregamento de link dispare uma sincronização sem querer |
| `test_sincronizar_chama_o_service_e_devolve_a_ultima_atualizacao` | 2 conexões, 07/10 09:00 e 08/10 12:30 (UTC) | 200, `["chamou"]` e a mais nova | confere a chamada e o `Max` |
| `test_sincronizar_sem_conexoes_devolve_null` | nada | `{"ultima_atualizacao": None}` | o `Max` de tabela vazia não pode quebrar |
| `test_sincronizar_com_pluggy_fora_responde_502` | sincronizar falso que levanta `requests.ConnectionError` | 502 com a mensagem exata | o `ConnectionError` é "filho" de `RequestException`, então cai no `except` da view, como aconteceria sem internet |

No teste do horário, `parse_datetime(...)` lê o texto do JSON de volta para data e hora.
Comparar texto com texto falharia por detalhes de escrita (o DRF pode escrever o fuso
como `Z` ou `+00:00`, ou converter para o fuso local), mesmo sendo o mesmo instante.
Comparando datas, só importa o instante.

### Rodar só os testes deste módulo

```
cd backend
pytest financas/tests/test_api_contas.py financas/tests/test_api_transacoes.py financas/tests/test_api_sincronizar.py -v
```

Ou, mais curto: `pytest -k api -v` (roda os testes cujo caminho ou nome contém "api").

## 6. Testar à mão

Com o banco do Docker no ar e o ambiente virtual ativado (`cd backend` e
`source .venv/bin/activate.fish`):

1. **Criar a tabela de tokens** (uma vez):

   ```
   python manage.py migrate
   ```

   Esperado: `Applying authtoken.0001_initial... OK` e mais algumas linhas do
   `authtoken`. Ele mexe só na estrutura do banco; seus dados continuam.

2. **Criar o seu token** (uma vez; use o usuário do `createsuperuser`):

   ```
   python manage.py drf_create_token SEU_USUARIO
   ```

   Esperado: `Generated token 9944b0... for user SEU_USUARIO`. Se rodar de novo, ele
   mostra o mesmo token. Para trocar por um novo (se vazar): `drf_create_token -r
   SEU_USUARIO`. O token também aparece no admin, em "Tokens". Fonte: documentação do
   DRF, "Authentication", seção "Generating Tokens" (conferido em 2026-10-08).

   **Não cole o token em arquivo versionado nem em mensagem de commit.**

3. **Subir o servidor**: `python manage.py runserver`.

4. **Pedir os dados**, em outro terminal (fish):

   ```
   set TOKEN cole_o_token_aqui
   curl -i http://127.0.0.1:8000/api/contas/
   curl -i -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/contas/
   curl -i -H "Authorization: Token $TOKEN" "http://127.0.0.1:8000/api/transacoes/?mes=2026-10"
   curl -i -H "Authorization: Token $TOKEN" "http://127.0.0.1:8000/api/transacoes/?mes=abc"
   curl -i -X POST -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/sincronizar/
   ```

   - `-i` mostra também o status (`HTTP/1.1 200 OK`) e os cabeçalhos.
   - `-H` acrescenta um cabeçalho; `-X POST` troca o método.
   - O endereço com `?` vai entre aspas, porque o fish trata `?` como curinga de nome de
     arquivo.
   - O primeiro deve dar `401` com `WWW-Authenticate: Token`; os outros, `200`, `200`,
     `400` e `200`.
   - O sincronizar demora alguns segundos: ele busca tudo na Pluggy antes de responder.

5. **Pelo navegador**: abrir `http://127.0.0.1:8000/api/contas/` mostra a página do DRF
   com "As credenciais de autenticação não foram fornecidas." Isso é esperado: o
   navegador não manda token. Use o `curl`.

## 7. Decisões, limites e o que ficou para depois

Decisões aprovadas em 2026-10-08:

- Contas numa **lista simples** com `nome_banco`, sem agrupar por banco no JSON. Agrupar
  é organização de tela, e o app faz isso. A ordenação por banco já deixa as contas de
  cada banco juntas.
- Rotas de leitura com `ListAPIView`, lendo os models **direto**, sem service: não há
  regra de negócio para isolar. Só o sincronizar chama service.
- Sem `?mes=`, vale o **mês atual**.
- **Sem limite** de uma vez por hora no sincronizar: a Pluggy aceita 360 leituras por
  minuto, e uma sincronização faz uns 15 pedidos (`docs/pluggy.md`, seção 6).
- **Sem paginação**: um mês tem algumas centenas de transações, no máximo.

Limites conhecidos (aceitos por enquanto):

- `?mes=2026-1` (mês com um dígito) é aceito como janeiro. Não atrapalha; o app vai
  mandar sempre dois dígitos.
- O sincronizar é **síncrono**: o pedido espera a sincronização inteira. Se um dia
  demorar demais, a saída é rodar em segundo plano (fica para o RF25).
- Com só `TokenAuthentication`, a página navegável do DRF não aceita mais o login do
  admin. O admin do Django continua igual.
- O token vai ficar no `.env` do Expo, que é o risco aceito em 2026-10-04 (depois vai
  para o `expo-secure-store`).
- Ainda não existem `PATCH /api/transacoes/<id>/` (RF08), `POST /api/transacoes/` (RF10)
  nem os filtros por conta e categoria (RF09). São desejáveis, para depois.

## 8. Para estudar mais

- DRF, autenticação e tokens: https://www.django-rest-framework.org/api-guide/authentication/
- DRF, permissões: https://www.django-rest-framework.org/api-guide/permissions/
- DRF, views genéricas (`ListAPIView`): https://www.django-rest-framework.org/api-guide/generic-views/
- DRF, serializers e o `source`: https://www.django-rest-framework.org/api-guide/fields/#source
- DRF, como as exceções viram respostas: https://www.django-rest-framework.org/api-guide/exceptions/
- Django, `select_related`: https://docs.djangoproject.com/en/6.1/ref/models/querysets/#select-related
- Django, `aggregate` e `Max`: https://docs.djangoproject.com/en/6.1/topics/db/aggregation/
- Códigos HTTP explicados (MDN, em português): https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Status
- pytest, `conftest.py`: `docs/pytest.md`, seção 3.
