# Django REST Framework (DRF) no projeto

Guia de estudo do que o backend usa do DRF. Escrito em 2026-10-08. Versão: DRF 3.18.1
(ver `backend/requirements.txt`). Documentação oficial: https://www.django-rest-framework.org/

O módulo que usa quase tudo daqui é o `docs/estudos/modulos/api-de-leitura.md`; este arquivo
explica as peças, e o do módulo mostra elas funcionando juntas.

## 1. O que é o DRF e por que ele existe

O **Django** sozinho foi pensado para sites: a view devolve uma página HTML montada com
templates. O nosso cliente não é um navegador, e sim um app de celular, que quer
**dados** (JSON) e não páginas.

Dá para devolver JSON com Django puro (`JsonResponse`), mas aí cada view precisaria
repetir à mão: ler o token, recusar quem não tem, transformar `Decimal` e datas em texto,
validar o que chegou, responder com o código de status certo. O **DRF** é uma biblioteca
que fica em cima do Django e já resolve essas partes. Ele não substitui o Django: os
models, as migrations, o admin e o `urls.py` continuam sendo do Django.

```
Django:  urls.py ──► view ──► template HTML ──► navegador
DRF:     urls.py ──► view do DRF ──► serializer ──► JSON ──► app
                      │
                      └── autenticação, permissão, erros (prontos)
```

## 2. As peças, na ordem em que um pedido passa por elas

### 2.1 `Request` e `Response`

Fonte: https://www.django-rest-framework.org/api-guide/requests/ e
https://www.django-rest-framework.org/api-guide/responses/

- `request` (dentro de uma view do DRF) é o pedido "melhorado" do Django. O que usamos:
  - `request.query_params`: os parâmetros depois do `?` na URL. Em
    `/api/transacoes/?mes=2026-10`, `request.query_params.get("mes")` dá `"2026-10"`,
    e dá `None` se o parâmetro não veio.
  - `request.user`: quem fez o pedido, descoberto pela autenticação (seção 2.3).
- `Response(dados, status=...)`: você entrega um dicionário ou uma lista do Python, e o
  DRF transforma em JSON. Sem `status`, a resposta é `200`. Exemplo do projeto:
  `Response({"status": "ok"})` na `health`.

### 2.2 Views: `@api_view` e as views genéricas

Fonte: https://www.django-rest-framework.org/api-guide/views/ e
https://www.django-rest-framework.org/api-guide/generic-views/

O DRF oferece dois jeitos de escrever uma view. Usamos os dois.

**Função com `@api_view`**, para ações ou respostas montadas à mão:

```python
@api_view(["POST"])
def sincronizar(request):
    ...
    return Response({"ultima_atualizacao": ultima})
```

- O `@api_view([...])` é um decorador (ver `docs/estudos/pytest.md`, seção 3, "o que é o `@`")
  que transforma uma função comum numa view do DRF. A lista diz quais métodos ela
  aceita; qualquer outro recebe `405`.
- Onde usamos: `core/views.py` (`health`) e `financas/views.py` (`sincronizar`).

**Classe genérica**, para os casos comuns, como "listar linhas do banco":

```python
class ContasView(generics.ListAPIView):
    serializer_class = ContaSerializer
    queryset = Conta.objects.select_related("conexao").order_by(...)
```

- A `ListAPIView` já sabe responder a um `GET`: pega as linhas do `queryset`, passa cada
  uma pelo `serializer_class` e responde `200` com a lista. Você só configura.
- Quando as linhas dependem do pedido (como o mês), troca-se o atributo `queryset` pelo
  método `get_queryset(self)`, que pode ler `self.request`.
- Existem outras prontas: `RetrieveAPIView` (uma linha só), `CreateAPIView` (criar),
  `UpdateAPIView` (alterar). Vamos usar algumas no RF08 e no RF10.
- No `urls.py`, a classe entra com `.as_view()`, porque o Django espera uma função.

Qual escolher? Se cabe numa genérica, use a genérica (menos código, menos erro). Se é uma
ação ou um cálculo, `@api_view`.

### 2.3 Autenticação: "quem é você?"

Fonte: https://www.django-rest-framework.org/api-guide/authentication/ (conferido em
2026-10-08)

- A autenticação **descobre** quem fez o pedido; ela ainda não decide se pode entrar.
- Usamos a `TokenAuthentication`: ela lê o cabeçalho `Authorization: Token <chave>`,
  procura a chave na tabela de tokens (do app `rest_framework.authtoken`) e põe o dono em
  `request.user`.
  - Sem cabeçalho: o usuário fica como anônimo.
  - Com uma chave que não existe: responde `401` na hora.
- Configurada para todas as views em `config/settings.py`
  (`DEFAULT_AUTHENTICATION_CLASSES`).
- Criar um token: `python manage.py drf_create_token <usuário>`; trocar por um novo:
  `drf_create_token -r <usuário>`.

### 2.4 Permissões: "você pode entrar?"

Fonte: https://www.django-rest-framework.org/api-guide/permissions/

- Depois da autenticação, as permissões **decidem**. Usamos duas:
  - `IsAuthenticated`: só entra quem tem usuário (ou seja, mandou um token válido). É o
    padrão de todas as views (`DEFAULT_PERMISSION_CLASSES` no `settings.py`).
  - `AllowAny`: qualquer um entra. Usada só na `health`, com
    `@permission_classes([AllowAny])` logo abaixo do `@api_view`.
- Numa classe, o equivalente seria o atributo `permission_classes = [AllowAny]`.
- Quando a permissão recusa alguém que não se identificou, a resposta é `401` (com o
  cabeçalho `WWW-Authenticate: Token`). Se o usuário fosse conhecido mas proibido, seria
  `403`; ainda não temos esse caso.

### 2.5 Serializers: de objeto Python para JSON

Fonte: https://www.django-rest-framework.org/api-guide/serializers/ e
https://www.django-rest-framework.org/api-guide/fields/

- O serializer é o tradutor entre os models e o JSON. Ele funciona nos dois sentidos:
  - na saída, objeto para dicionário (o que usamos até agora);
  - na entrada, valida o JSON que chega e o transforma em objeto (vamos usar no RF10,
    gasto manual).
- `ModelSerializer`: lê o model e cria os campos sozinho. Na `class Meta`, `model` diz qual
  model e `fields` diz **quais campos saem**. Preferimos uma lista fechada a `"__all__"`,
  para nada sair sem alguém decidir.
- Campo com `source`: busca o valor em outro lugar.
  - `CharField(source="conexao.nome_banco")` segue a ligação.
  - `CharField(source="categoria_exibida")` lê uma `@property` do model.
  - `read_only=True` marca que o campo só sai, nunca entra.
- Tradução automática de tipos:
  - `Decimal` vira texto (`"1234.56"`), para não perder centavos;
  - `date` vira `"2026-10-05"`;
  - `datetime` vira texto no formato ISO 8601;
  - `None` vira `null`;
  - uma `ForeignKey` vira o id da linha ligada.

### 2.6 Exceções: erros que viram respostas

Fonte: https://www.django-rest-framework.org/api-guide/exceptions/

- Dentro de uma view do DRF, você pode **levantar** certas exceções em vez de montar a
  resposta de erro. O DRF captura e responde com o código certo:
  - `ValidationError(...)`: `400`. Usada no `ler_mes()` para mês inválido.
  - `NotAuthenticated` e `AuthenticationFailed`: `401`. Quem levanta é o próprio DRF,
    na autenticação e na permissão.
  - `MethodNotAllowed`: `405`, também levantada pelo próprio DRF.
- Uma exceção que o DRF não conhece (como `requests.ConnectionError`) **não** é
  capturada e viraria um `500`. Por isso a view `sincronizar` tem o próprio
  `try`/`except`, que devolve `502` com uma mensagem.

### 2.7 Configuração global: `REST_FRAMEWORK`

Fonte: https://www.django-rest-framework.org/api-guide/settings/

Um dicionário no `config/settings.py` com os padrões de todas as views. Hoje temos duas
chaves: `DEFAULT_AUTHENTICATION_CLASSES` e `DEFAULT_PERMISSION_CLASSES`. Algumas
configurações valem mesmo sem estar escritas, como `COERCE_DECIMAL_TO_STRING`, que vem
`True` e é o que faz `Decimal` virar texto.

## 3. A ordem completa dentro de uma view do DRF

Isto explica por que um `GET` sem token no sincronizar dá `401`, e com token dá `405`:

1. Autenticação (2.3): descobre o usuário, ou dá `401` se o token não existe.
2. Permissões (2.4): `401` para anônimo onde se exige login.
3. Método: se a view não aceita o método, `405`.
4. A view roda: consulta o banco, chama o serializer e monta a `Response`. Uma
   `ValidationError` aqui vira `400`.
5. A resposta vira JSON.

## 4. Testes com o DRF

Fonte: https://www.django-rest-framework.org/api-guide/testing/

- `APIClient` (de `rest_framework.test`): um "app falso" que faz pedidos direto ao Django,
  sem servidor e sem rede. `cliente.get("/api/contas/")`, `cliente.post(...)`.
- `cliente.credentials(HTTP_AUTHORIZATION="Token <chave>")`: faz o cliente mandar esse
  cabeçalho em todos os pedidos seguintes. O `HTTP_` na frente é o jeito do Django de
  nomear cabeçalhos.
- `resposta.status_code` dá o código; `resposta.json()` dá o JSON já como lista ou
  dicionário do Python, pronto para o `assert`.
- No projeto, a fixture `cliente_com_token` (em `financas/tests/conftest.py`) junta tudo
  isso; ver `docs/estudos/pytest.md`, seção 3.

## 5. A página navegável

Abrir uma rota do DRF no navegador mostra uma página HTML com o JSON formatado (a
"browsable API"). Como só ligamos a `TokenAuthentication`, e o navegador não manda token,
ela mostra "As credenciais de autenticação não foram fornecidas." Para testar à mão, use
o `curl` (ver `docs/estudos/modulos/api-de-leitura.md`, seção 6).

## 6. Onde cada peça aparece no código

| Peça | Arquivo |
|---|---|
| `@api_view`, `Response` | `backend/core/views.py`, `backend/financas/views.py` |
| `ListAPIView`, `get_queryset` | `backend/financas/views.py` |
| `TokenAuthentication`, `IsAuthenticated` | `backend/config/settings.py` |
| `AllowAny`, `@permission_classes` | `backend/core/views.py` |
| `ModelSerializer`, `source` | `backend/financas/serializers.py` |
| `ValidationError` | `backend/financas/views.py` (`ler_mes`) |
| `APIClient`, `credentials` | `backend/financas/tests/conftest.py` e `test_api_*.py` |
