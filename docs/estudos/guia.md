# Guia de estudos

Mapa de tudo o que existe para estudar no projeto, na ordem certa. Atualizado a cada
sessão e sempre que um documento de estudo novo entra nesta pasta.

Última atualização: 2026-10-10.

## O projeto em poucas linhas

App pessoal de finanças: mostra em tempo real entradas, saídas, saldos e faturas das
contas Nubank, Inter e PicPay. Os dados vêm da Pluggy (Open Finance) para um backend
Django + DRF, que guarda tudo no PostgreSQL (no Docker) e entrega JSON a um app React
Native com Expo. Hoje o backend já sincroniza com a Pluggy e tem API de contas,
transações, sincronização e resumo do mês. O app mobile já mostra a tela Início com o
resumo do mês no visual escuro do guia de design, e edita o início do mês e o limite da
fatura; as outras telas são os próximos passos.

## Ordem de estudo

Cada item diz o que você precisa ter estudado antes. Se travar num documento, volte
aos pré-requisitos dele.

| # | Documento | O que ensina | Antes, estude |
|---|---|---|---|
| 1 | [`pytest.md`](pytest.md), seções 1 a 3 | como o pytest acha testes, `assert`, decorador (`@`), fixtures e `conftest.py` | nada (é o ponto de partida) |
| 2 | [`pytest.md`](pytest.md), seções 4 a 7 | `monkeypatch`, `pytest.raises`, banco nos testes (pytest-django), comandos | item 1 |
| 3 | [`testes/test_pluggy.md`](testes/test_pluggy.md) | testar um cliente HTTP sem internet (trocando o `requests`) | item 2 e o código `backend/financas/integracoes/pluggy.py` |
| 4 | [`testes/test_sincronizacao.md`](testes/test_sincronizacao.md) | testar uma regra de negócio que grava no banco | item 3 |
| 5 | [`drf.md`](drf.md) | o que é o DRF e cada peça usada: views, serializers, token, permissões, erros | Django básico (models e `urls.py`) |
| 6 | [`modulos/api-de-leitura.md`](modulos/api-de-leitura.md) | Módulo 1: o caminho de um pedido do app até o banco e de volta | itens 4 e 5 |
| 7 | [`modulos/resumo-do-mes.md`](modulos/resumo-do-mes.md) | Módulo 2: cálculos de dinheiro (somas, exclusões, "posso gastar por dia") | item 6 |
| 8 | [`jest.md`](jest.md), seções 1 a 5 | Jest e Testing Library: `describe`, `it`, `expect`, `render`, `screen`, `async`/`await` | item 1 (pytest), para comparar |
| 9 | [`modulos/base-mobile.md`](modulos/base-mobile.md) | Módulo 3a: Expo Router (rotas por arquivo), dependências e o primeiro teste do app | item 8 |
| 10 | [`jest.md`](jest.md), seções 6 a 9 | testar rotas com `renderRouter`, TypeScript nos testes, comandos | item 9 |
| 11 | [`jest.md`](jest.md), seções 10 a 14 | mocks (`jest.fn`), `beforeEach`/`afterEach`, `findBy`/`queryBy`, `fireEvent`, relógio falso | item 10 e o `monkeypatch` (item 2) |
| 12 | [`modulos/tela-inicio.md`](modulos/tela-inicio.md) | Módulo 3b-1: `useState`, `useEffect`, `fetch` com token, limite de tempo, rede local | itens 7 e 11 |
| 13 | [`modulos/regras-do-mes.md`](modulos/regras-do-mes.md) | Módulo 4a: app novo, tabela de uma linha, `PATCH`, mês começando dias antes, fórmula nova | itens 5 e 7 |
| 14 | [`jest.md`](jest.md), seções 15 a 17 | dublê que responde por endereço, `jest.mock` de um pacote, digitar e elementos escondidos | item 11 |
| 15 | [`modulos/design-e-edicao.md`](modulos/design-e-edicao.md) | Módulo 4b: tema, fonte, `Pressable` e `Modal`, a folha de edição do toque ao resumo recarregado | itens 12, 13 e 14 |

## Documentos de consulta (fora desta pasta)

Não são para ler do começo ao fim; servem para tirar dúvidas.

- [`../requisitos.md`](../requisitos.md): o que o app precisa fazer (RF e RNF) e as dúvidas decididas.
- [`../arquitetura.md`](../arquitetura.md): o desenho geral (caminho dos dados, models, rotas).
- [`../pluggy.md`](../pluggy.md): tudo da Pluggy que usamos, com fontes e datas.

## Para a próxima sessão de estudos

Sugestão de roteiro, de 1 a 2 horas:

1. Itens 1 e 2 (o pytest), com os testes abertos ao lado.
2. Item 5 (o DRF), só as seções 1 a 3.
3. Item 6 (Módulo 1), seção 3, seguindo o caminho de um pedido no código.
4. Na prática: a seção 6 do item 6 (testar a API com `curl`).
5. Se sobrar tempo: item 8 (o Jest), comparando com o pytest (seção 9 do `jest.md`).

Pendência antiga: entender o funcionamento interno do pytest (descoberta de testes,
plugins, reescrita do `assert`). Fontes: docs.pytest.org, seção "Get Started"; livro
"Python Testing with pytest", de Brian Okken.
