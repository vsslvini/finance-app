# Plano do Módulo 8: categorias em português e troca de categoria (RF07, RF08)

Decidido pelo Claude em 2026-10-17, no modo autônomo. 8a é o backend; 8b é o app (depois do 7b,
porque os dois mexem no `api.ts`).

## O que a Pluggy oferece (conferido em 2026-10-17)

- `GET /categories` (operationId `categories-list`): lista paginada por número de página
  (`page`, `total`, `totalPages`, `results`), filtro opcional `parentId`. Cada item: `id`
  ("01010000"), `description` ("Salary"), `descriptionTranslated` ("Salário"), `parentId` e
  `parentDescription` (opcionais). Fonte: https://docs.pluggy.ai/en/reference/Category/categories-list
- Na conta real: 130 categorias numa página só; as 45 categorias usadas nas transações têm
  tradução.

## Decisões

1. Por dentro, tudo continua em inglês: `categoria_pluggy` e as regras do resumo (que comparam
   nomes em inglês) não mudam. A categoria manual (RF08) também guarda o nome em inglês de uma
   categoria da Pluggy, escolhida da lista. Só o que o app **mostra** é traduzido.
2. As categorias ficam numa tabela nossa (`Categoria`), atualizada a cada `sincronizar()`, para
   o app não depender da Pluggy na hora de mostrar.
3. A API de transações (e os "últimos gastos" do resumo) passa a ter dois campos:
   `categoria` (o texto em português para mostrar) e `categoria_original` (o nome em inglês, para
   o app escolher o ícone e para marcar a categoria atual na troca).
4. Sem tradução conhecida (ex.: tabela ainda vazia), mostra o nome em inglês; sem categoria,
   "Sem categoria".

## 8a: backend (`python-backend-engineer`)

1. `integracoes/pluggy.py`: `listar_categorias(api_key)`, juntando as páginas (como
   `listar_investimentos`).
2. Model `Categoria` (app `financas`): `id_pluggy` (único), `descricao` (inglês, único),
   `descricao_pt` (vazio permitido), `id_pai` (vazio permitido). Admin só leitura (lista).
3. `sincronizar()`: no começo, busca as categorias e faz `update_or_create` por `id_pluggy`
   (não apaga as que sumirem: uma transação antiga pode usar).
4. Tradução sem consultas repetidas: a view monta um dicionário `{descricao: descricao_pt}` uma
   vez por pedido e passa ao serializer pelo `context` (o `ResumoSerializer` repassa ao
   serializer dos últimos gastos). O `TransacaoSerializer` ganha `categoria` (traduzida) e
   `categoria_original` (`categoria_manual` ou `categoria_pluggy`, ou `""`).
5. `GET /api/categorias/`: lista para a troca, `[{"descricao": "Groceries", "nome": "Mercado"}]`
   (nome = `descricao_pt` ou, vazio, a `descricao`), em ordem alfabética do `nome`. Só as
   categorias que não são "pai" de outras (as de primeiro nível, como "Income", são grupos).
6. `PATCH /api/transacoes/<id>/` com `{"categoria_manual": "Groceries"}`: só aceita uma
   `descricao` que exista na tabela `Categoria`, ou `""` (volta para a categoria da Pluggy).
   Mensagem: "Categoria desconhecida.". Responde a transação no formato da lista. Transação
   inexistente: 404.
7. `docs/pluggy.md`: seção da rota `/categories`; `docs/arquitetura.md`: rotas novas.

Casos de teste (8a):

1. O cliente da Pluggy lista as categorias e junta as páginas (Pluggy falsa).
2. `sincronizar()` cria as categorias e, na segunda vez, atualiza a tradução sem duplicar; uma
   categoria que sumiu da Pluggy continua na tabela.
3. A lista de transações mostra `categoria` "Mercado" e `categoria_original` "Groceries" quando
   há tradução; sem tradução, os dois em inglês; sem categoria, "Sem categoria" e `""`.
4. A categoria manual vence a da Pluggy, também traduzida.
5. Os últimos gastos do resumo vêm traduzidos do mesmo jeito.
6. Traduzir não faz uma consulta por transação (`django_assert_num_queries` ou contagem igual
   para 1 e para 5 transações).
7. `GET /api/categorias/` devolve só as categorias filhas, com `nome` em português, em ordem
   alfabética; exige token.
8. `PATCH /api/transacoes/<id>/` troca a categoria e devolve a transação traduzida; `""` volta
   para a da Pluggy; categoria desconhecida dá 400 com a mensagem; id inexistente dá 404; sem
   token, 401.

## 8b: app (depois do 7b)

- Ícones pela `categoria_original` (o `categorias.ts` compara nomes em inglês) no Início e em
  Transações; o texto mostrado é a `categoria` (português).
- Tocar numa transação (aba Transações) abre a folha "Categoria", com um campo de busca e a lista
  de `GET /api/categorias/`; a atual fica marcada; há a opção "Usar a categoria do banco"
  (manda `""`). Ao escolher, `PATCH` e a lista é relida.
- Casos de teste definidos junto com o 8b.
