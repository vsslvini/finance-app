# Guia de estudos

Mapa de tudo o que existe para estudar no projeto, na ordem certa. Atualizado a cada
sessão e sempre que um documento de estudo novo entra nesta pasta.

Última atualização: 2026-10-18.

## O projeto em poucas linhas

App pessoal de finanças: mostra em tempo real entradas, saídas, saldos e faturas das
contas Nubank, Inter e PicPay. Os dados vêm da Pluggy (Open Finance) para um backend
Django + DRF, que guarda tudo no PostgreSQL (no Docker) e entrega JSON a um app React
Native com Expo. Hoje o backend já sincroniza com a Pluggy (inclusive investimentos) e tem API de contas,
transações, sincronização, resumo do mês e plano de guardar. O app mobile já mostra a tela Início com o
resumo do mês no visual escuro com acento roxo e ícones, e edita o início do mês, o limite da
fatura e o plano de guardar (seção Guardado); e tem as abas Transações, Cartões e Contas.

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
| 16 | [`modulos/ajustes-do-mes.md`](modulos/ajustes-do-mes.md) | Módulo 4c: por que a regra de Entrou e Saiu mudou (o caso real), condições combinadas com `Q`, ícones | item 15 |
| 17 | [`modulos/guardado-backend.md`](modulos/guardado-backend.md) | Módulo 5a: investimentos da Pluggy, plano de guardar, funções puras, `validate()` com dois campos, `context` e serializer dentro de serializer | itens 13 e 16 |
| 18 | [`modulos/guardado-tela.md`](modulos/guardado-tela.md) | Módulo 5b: seção Guardado, barra de progresso acessível, componente reaproveitado, folha com dois campos | item 17 |
| 19 | [`modulos/atualizar.md`](modulos/atualizar.md) | Módulo 3b-2: puxar para baixo (`RefreshControl`), hora sem converter fuso, função pura com "hoje" de fora | itens 12 e 18 |
| 20 | [`modulos/faturas-futuras.md`](modulos/faturas-futuras.md) | Módulo 7: estimar faturas pelas parcelas, expressão regular, tupla como chave, `divmod` para meses | item 17 |
| 21 | [`modulos/abas-e-telas.md`](modulos/abas-e-telas.md) | Módulo 6: grupo de rotas e abas, hook próprio (`useCarga`), `key` para trocar de mês, testes com ajudante compartilhado | itens 15 e 19 |
| 22 | [`modulos/categorias.md`](modulos/categorias.md) | Módulo 8: tradução sem N+1 (`context`), `SerializerMethodField`, `PATCH` com validação, folha com busca | itens 17 e 21 |
| 23 | [`modulos/relatorio.md`](modulos/relatorio.md) | Módulo 9: relatório do mês, dois totais diferentes (Saiu e Gastos), extrair função para não copiar regra | itens 16 e 22 |
| 24 | [`modulos/sincronizacao-automatica.md`](modulos/sincronizacao-automatica.md) | Módulo 10: comando do Django, `CommandError`, `capsys`, timer do systemd | itens 2 e 6 |
| 25 | [`modulos/transferencias-proprias.md`](modulos/transferencias-proprias.md) | Módulo 11: categoria efetiva com `Coalesce`/`NullIf`, opção fixa fora do filtro | itens 16 e 22 |
| 26 | [`modulos/dividas.md`](modulos/dividas.md) | Módulo 12: dívidas e parcelas, não contar duas vezes, `transaction.atomic`, `bulk_create`, `@property` | itens 17 e 23 |
| 27 | [`modulos/embelezamento.md`](modulos/embelezamento.md) | Módulo 13: Reanimated (`useSharedValue`, `withTiming`, animações de entrada), reduzir movimento, Reanimated no Jest | itens 21 e 26 |
| 28 | [`modulos/gasto-previsto-e-fixos.md`](modulos/gasto-previsto-e-fixos.md) | Módulo 14: gastos fixos com pago automático, gasto previsto, `UniqueConstraint`, `useFocusEffect` | itens 26 e 27 |
| 29 | [`modulos/editar-divida.md`](modulos/editar-divida.md) | Módulo 15: editar dívida, gerar parcelas de novo, exceção própria, serializer que herda de outro, `partial=True` | itens 26 e 28 |
| 30 | [`modulos/totais-a-pagar.md`](modulos/totais-a-pagar.md) | Módulo 16: totais da aba "A pagar", somar dinheiro em centavos inteiros, calcular na tela ou no backend | item 29 |
| 31 | [`modulos/planejamento-por-mes.md`](modulos/planejamento-por-mes.md) | Módulo 17: planejamento por mês, % da renda, reaproveitar services, nome acessível igual ao texto visível | item 30 |

## Documentos de consulta (fora desta pasta)

Não são para ler do começo ao fim; servem para tirar dúvidas.

- [`../requisitos.md`](../requisitos.md): o que o app precisa fazer (RF e RNF) e as dúvidas decididas.
- [`../arquitetura.md`](../arquitetura.md): o desenho geral (caminho dos dados, models, rotas).
- [`../pluggy.md`](../pluggy.md): tudo da Pluggy que usamos, com fontes e datas.
- [`../deploy.md`](../deploy.md): roteiro do deploy no servidor caseiro (Docker, Tailscale, backup, APK).

## Para a próxima sessão de estudos

Sugestão de roteiro, de 1 a 2 horas (atualizado em 2026-10-10):

1. Item 8 (o Jest, seções 1 a 5), comparando com o pytest (seção 9 do `jest.md`).
2. Item 12 (tela Início), seção 3: seguir o caminho de uma abertura do app no código,
   com o `useState` e o `useEffect` abertos ao lado.
3. Item 16 (ajustes do mês), seção 1: o caso real de "saiu mais do que entrou" mostra por
   que regras de dinheiro precisam de teste com dados de verdade.
4. Na prática: rodar `cd mobile && npx jest --verbose` e trocar um texto esperado para ver
   um teste ficar vermelho (seção 5 do `tela-inicio.md`).

Pendência antiga: entender o funcionamento interno do pytest (descoberta de testes,
plugins, reescrita do `assert`). Fontes: docs.pytest.org, seção "Get Started"; livro
"Python Testing with pytest", de Brian Okken.
