# Módulo 8: categorias em português e troca de categoria

Escrito em 2026-10-17. Atende RF07 (categorias legíveis) e RF08 (trocar a categoria). Plano em
[`../../planos/modulo-8-categorias.md`](../../planos/modulo-8-categorias.md). **Antes, estude**
[`api-de-leitura.md`](api-de-leitura.md) (serializers e views genéricas) e
[`guardado-backend.md`](guardado-backend.md) (`context` no serializer).

## 1. O que o módulo entrega

**8a (backend):**

- Tabela `Categoria` com as 130 categorias da Pluggy, em inglês e em português, atualizada a cada
  `sincronizar()` (rota `GET /categories` da Pluggy).
- A lista de transações e os últimos gastos do resumo trazem `categoria` em português
  ("Mercado") e `categoria_original` em inglês ("Groceries").
- `GET /api/categorias/`: a lista para escolher uma categoria.
- `PATCH /api/transacoes/<id>/` com `{"categoria_manual": "Groceries"}`: troca a categoria;
  `""` volta para a da Pluggy.
- 13 testes novos; o backend passa a ter 164.

**8b (app):** seção 7.

## 2. A decisão principal: por dentro, tudo em inglês

As regras do resumo (o que não conta como entrada ou saída, o que é investimento) comparam os
nomes da Pluggy em inglês. Se passássemos a guardar em português, essas regras quebrariam. Por
isso `categoria_pluggy` e `categoria_manual` guardam o nome **em inglês** de uma categoria da
Pluggy, e só o texto que o app mostra é traduzido, na hora de montar a resposta. O app recebe
também o nome em inglês (`categoria_original`), porque a escolha do ícone (`categorias.ts`)
compara nomes em inglês.

## 3. Conceitos novos

- **`SerializerMethodField`**: um campo cujo valor vem de um método `get_<campo>` do serializer.
  `get_categoria` pega a categoria exibida e procura a tradução.
- **Evitar uma consulta por transação**: buscar a tradução de cada transação no banco faria 100
  consultas para 100 transações (o famoso problema "N+1"). A view monta o dicionário
  `{"Groceries": "Mercado"}` **uma vez** (`Categoria.traducoes()`) e entrega ao serializer pelo
  `context`. O DRF repassa o `context` aos serializers de dentro, então os últimos gastos do
  resumo também recebem o dicionário.
- **`get_serializer_context()`**: numa view genérica (como a `TransacoesView`), é o método que
  monta o `context` do serializer; sobrescrevemos para incluir as traduções.
- **Contar consultas num teste**: `CaptureQueriesContext` (do Django) anota as consultas feitas
  dentro de um bloco `with`. O teste compara 1 transação com 5: o número tem que ser igual.
- **`Coalesce` e `NullIf`**: funções do banco usadas no `annotate`. `NullIf(descricao_pt, "")`
  troca texto vazio por nulo, e `Coalesce(..., descricao)` pega o primeiro que não é nulo. Assim
  o `nome` é a tradução ou, sem ela, o inglês, e a ordem alfabética (com acentos) fica a cargo do
  PostgreSQL.
- **`get_object_or_404`**: busca um objeto ou responde 404 sozinho.
- **Campo declarado é obrigatório**: no `CategoriaManualSerializer`, o campo
  `categoria_manual` é declarado à mão (`CharField(allow_blank=True)`), e campos declarados são
  obrigatórios por padrão. Sem isso, um `PATCH` com o nome do campo errado daria 200 sem mudar
  nada. (A primeira versão usava `extra_kwargs`, e o lint acusou `RUF012`, um dicionário mutável
  como atributo de classe.)

## 4. O caminho de uma troca

1. O app manda `PATCH /api/transacoes/7/` com `{"categoria_manual": "Groceries"}`.
2. A view `trocar_categoria` busca a transação (`get_object_or_404`) e valida com o
   `CategoriaManualSerializer`: o nome precisa existir na tabela `Categoria`, ou ser `""`.
3. Salva e responde a transação pelo `TransacaoSerializer`, já traduzida ("Mercado"), igual ao
   item da lista.

## 5. Arquivos

- `financas/integracoes/pluggy.py`: `listar_categorias(api_key)`.
- `financas/models.py`: `Categoria` e `Categoria.traducoes()`; migration `0003_categoria.py`.
- `financas/services/sincronizacao.py`: `salvar_categoria()`; as categorias são buscadas antes
  das conexões e nunca apagadas (uma transação antiga pode usar).
- `financas/serializers.py`: `categoria` e `categoria_original` no `TransacaoSerializer`,
  `CategoriaManualSerializer` e `CategoriaSerializer`.
- `financas/views.py` e `urls.py`: traduções no `context`, `trocar_categoria` e
  `CategoriasView` (sem as categorias que são grupo de outras).
- `financas/admin.py`: categorias só para leitura.
- `docs/pluggy.md` (seção 10) e `docs/arquitetura.md`.

## 6. Os testes (8a)

1. `test_listar_categorias_junta_as_duas_paginas` (cliente da Pluggy).
2. `test_categorias_sao_criadas_atualizadas_e_nunca_apagadas` (sincronização).
3. `test_categoria_traduzida_e_categoria_original`: com tradução, sem tradução e sem categoria.
4. `test_categoria_manual_vence_e_tambem_e_traduzida`.
5. `test_ultimos_gastos_vem_traduzidos` (resumo).
6. `test_traduzir_nao_faz_uma_consulta_por_transacao`.
7. `test_api_categorias.py`: 401 sem token; lista sem os grupos, com nome traduzido, em ordem.
8. Cinco testes do `PATCH`: troca e devolve traduzida; `""` volta para a da Pluggy; categoria
   desconhecida dá 400 com "Categoria desconhecida."; id inexistente dá 404; sem token, 401.

Testar à mão:

```fish
curl -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/categorias/
curl -X PATCH -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" \
  -d '{"categoria_manual": "Groceries"}' http://127.0.0.1:8000/api/transacoes/1/
```

## 7. 8b: o app

- Os últimos gastos do Início e os itens de Transações mostram a `categoria` (em português) e
  escolhem o ícone pela `categoria_original` (em inglês), porque o `categorias.ts` compara nomes
  em inglês.
- Na aba Transações, cada item virou um botão ("Toque para trocar a categoria"). Tocar abre a
  folha **"Categoria"** (`src/componentes/FolhaDeCategoria.tsx`): a descrição da transação, um
  campo "Buscar categoria", a opção "Usar a categoria do banco" (manda `""`) e a lista de
  `GET /api/categorias/`, com a categoria atual marcada (ícone `check` e
  `accessibilityState={{ selected: true }}`).
- **Busca sem acento**: `texto.normalize('NFD')` separa cada letra do seu acento ("ú" vira "u" +
  acento), e `.replace(/[̀-ͯ]/g, '')` apaga os acentos; com `toLowerCase()`, "saude"
  acha "Saúde". A lista filtrada é calculada na renderização, sem estado extra.
- Escolher uma categoria faz o `PATCH`; deu certo, a folha fecha e a lista é relida com o
  `atualizar()` do `useCarga` (sem "Carregando as transações..."). Deu errado, a folha fica com a
  mensagem (ex.: "Categoria desconhecida."). A folha mora dentro da `ListaDeTransacoes`, que já
  tem o `atualizar`, então nada precisou passar pela tela.
- `src/api.ts`: `categoria_original` no `GastoResumo`, tipo `Categoria`, `buscarCategorias()` e
  `trocarCategoria(id, categoriaManual)`.

Testes (`__tests__/transacoes-test.tsx` e `tela-inicio-test.tsx`; o app passa a ter 123):

1. Categoria em português e ícone de mercado pela `categoria_original` (no Início pelo testID
   do círculo; em Transações pelo texto que o dublê do Lucide desenha, `shopping-cart`).
2. Tocar abre "Categoria" com a descrição e a lista; a atual vem selecionada.
3. Busca: "merc" deixa "Mercado", "saude" acha "Saúde", "xyz" mostra "Nenhuma categoria
   encontrada.".
4. Escolher "Restaurantes" manda `{"categoria_manual": "Restaurants"}` para
   `/api/transacoes/3/`; segurando a releitura, "Carregando" não aparece; depois, a folha fecha
   e o item mostra "Restaurantes".
5. "Usar a categoria do banco" manda `{"categoria_manual": ""}`.
6. Com 400, a folha fica aberta com "Categoria desconhecida.".
7. "Cancelar" fecha sem `PATCH`.

Curiosidade dos testes: a Testing Library monta o nome de um botão com o texto de **todos** os
filhos, até os escondidos. O ícone `check` (que o dublê desenha como o texto "check") entra no
nome do botão da categoria atual; por isso esse botão é achado por `selected: true`.
