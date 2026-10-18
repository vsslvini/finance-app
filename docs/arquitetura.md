# Arquitetura

Como o app é montado para atender `docs/requisitos.md`. Aprovada em 2026-10-04.

## 1. O caminho dos dados

```
Bancos ──► Pluggy ──► Backend Django ──► PostgreSQL
                         │  (busca e guarda)
                         ▼
                     API /api/... ──► App Expo (celular)
```

- Só o backend conversa com a Pluggy; as chaves ficam no `.env` dele (RNF01).
- O backend guarda uma cópia de contas e transações no nosso PostgreSQL, e o app lê só do nosso backend.

Por que guardar uma cópia:

- A Pluggy limita atualizações pedidas pela API (uma por hora por conexão); ler do nosso banco é instantâneo.
- Categoria manual, gasto manual, metas e dívidas não existem na Pluggy; precisam morar no nosso banco.
- Os cálculos ("posso gastar por dia", faturas futuras) ficam fáceis de testar com pytest.

## 2. Backend

App Django `financas` para os dados dos bancos. Configurações, plano de guardar e dívidas ficam no app `planejamento`.

### Models

| Model | Para que serve | Campos principais |
|---|---|---|
| `Conexao` | um banco conectado no Meu Pluggy | id da Pluggy, nome do banco, última atualização |
| `Conta` | conta corrente ou cartão | conexão, id da Pluggy, tipo, nome, saldo; no cartão: limite total, limite disponível, fechamento, vencimento |
| `Transacao` | cada entrada ou saída | conta, data, descrição, valor, categoria da Pluggy, categoria manual, parcela X de Y, id da Pluggy (vazio se manual) |
| `Investimento` | cada investimento da Pluggy (desde 2026-10-17) | conexão, id da Pluggy, nome, tipo, subtipo, instituição, saldo, status |
| `Categoria` | a árvore de categorias da Pluggy, para mostrar em português (desde 2026-10-17) | id da Pluggy, descrição em inglês, descrição em português, id da categoria pai |
| `PlanoDeGuardar` (app `planejamento`) | o plano de guardar, uma linha só | valor por mês e mês alvo (os dois vazios = sem plano) |
| `Divida` (app `planejamento`, desde 2026-10-18) | uma dívida com alguém (RF21) | para quem (`credor`), motivo, valor total, número de parcelas (`total_parcelas`, 1 a 120), mês da primeira parcela (dia 1), criada em |
| `ParcelaDaDivida` (app `planejamento`, desde 2026-10-18) | cada parcela mensal de uma dívida, gerada ao cadastrar | dívida (`CASCADE`: apagar a dívida apaga as parcelas), número, mês (dia 1), valor, paga, paga em |

- Os ids das conexões (copiados do painel da Pluggy) são cadastrados pelo admin do Django.
- Valores em dinheiro usam `DecimalField`, exato até o centavo (RNF04).
- Transação sem categoria aparece como "Sem categoria".

### Organização dos arquivos de cada app

Além de `models.py`, `views.py`, `serializers.py` e `admin.py` (o que o Django e o DRF já
preveem), cada app usa duas pastas (decidido em 2026-10-07):

- `integracoes/`: clientes de serviços de fora, que só sabem falar HTTP e não importam os
  models (ex.: `financas/integracoes/pluggy.py`). Trocar a Pluggy mexe só aqui.
- `services/`: regras de negócio, que usam as integrações e os models (ex.:
  `financas/services/sincronizacao.py`; depois, o resumo e as faturas futuras).

```
App Expo ──► urls.py ──► View ──► services/ ──► models.py ──► PostgreSQL
                                     │
                                     └──► integracoes/ ──► Pluggy
```

A view só recebe o pedido e chama o service; o service pode ser chamado também pelo shell,
pela atualização automática e pelos testes, sem HTTP.

### Sincronização

Função `sincronizar()`: para cada conexão, busca na Pluggy contas e transações e cria ou atualiza as linhas no nosso banco. É chamada por `POST /api/sincronizar/` (puxar a tela para baixo), sem limite por hora: o nosso `sincronizar()` só lê o que a Pluggy já tem, e as leituras aceitam 360 pedidos por minuto (decidido em 2026-10-08). A atualização automática (RF25) chama a mesma função, mais tarde.

Chamadas HTTP à Pluggy com a biblioteca `requests`. Os detalhes das rotas da Pluggy são conferidos na documentação durante a implementação.

### Rotas da API

| Rota | Requisitos |
|---|---|
| `GET /api/resumo/?mes=2026-10` | saldo total, entradas, saídas, posso gastar por dia, últimos gastos (RF15 a RF18), o bloco `guardado` (RF04, RF28, RF29) e, desde 2026-10-18, `dividas_do_mes` (parcelas não pagas do mês, somadas em `saidas`) e `dividas_atrasadas` (não pagas de meses antes do mês atual do app, `"0.00"` fora dele); o "posso gastar" desconta as duas (RF21) |
| `GET /api/relatorio/?mes=2026-10` | relatório do mês: entradas, saídas e saldo do mês (iguais aos do resumo), total de gastos (corrente e cartão, sem pagamento de fatura), gastos por categoria (traduzida, com porcentagem) e os 5 maiores gastos no formato da lista de transações (RF27, desde 2026-10-17); desde 2026-10-18 as parcelas não pagas do mês entram como a categoria "Dívidas" (fora dos maiores gastos) |
| `GET /api/contas/` | lista de contas com o nome do banco (o app agrupa), com dados do cartão (RF01 a RF03, RF11, RF12, RF14) |
| `GET /api/transacoes/?mes=...` | transações do mês, com filtros opcionais (RF05 a RF07, RF09); cada uma traz `categoria` (em português, para mostrar) e `categoria_original` (o nome em inglês da Pluggy) |
| `PATCH /api/transacoes/<id>/` | trocar a categoria com `{"categoria_manual": "Groceries"}` (o nome em inglês de uma categoria da lista; `""` volta para a da Pluggy) e receber a transação no formato da lista (RF08, desde 2026-10-17) |
| `GET /api/categorias/` | categorias para a troca, `[{"descricao": "Groceries", "nome": "Mercado"}]`, sem as que são grupo de outras, em ordem alfabética do nome (RF07, RF08, desde 2026-10-17) |
| `POST /api/transacoes/` | gasto manual (RF10) |
| `GET /api/faturas-futuras/` | estimativa dos 6 meses seguintes ao mês atual do app, pelas compras parceladas do cartão: total do mês e total por cartão (RF13) |
| `POST /api/sincronizar/` | atualizar agora (RF24) |
| `GET` e `PATCH /api/configuracoes/` | dias antes do mês e limite da fatura, do app `planejamento` (RF30, RF31) |
| `GET` e `PATCH /api/plano/` | plano de guardar (valor por mês e mês alvo `AAAA-MM`), do app `planejamento` (RF28) |
| `GET` e `POST /api/dividas/` | lista das dívidas (mais recente primeiro) com pago, restante, próxima parcela e parcelas (cada uma com `atrasada`); o `POST` com `{credor, motivo, valor_total, parcelas, mes_inicio: "AAAA-MM"}` cria a dívida e gera as parcelas (RF21, desde 2026-10-18) |
| `PATCH` e `DELETE /api/dividas/<id>/` | muda só `credor` e `motivo`; o `DELETE` apaga a dívida e as parcelas (204) (RF21, desde 2026-10-18) |
| `PATCH /api/parcelas/<id>/` | marca ou desmarca a parcela com `{"paga": true\|false}` e responde a dívida inteira (RF21, desde 2026-10-18) |

Os cálculos ficam no backend, não no app: uma fonte só da verdade, testada com pytest.

## 3. Segurança da API (RNF03)

- Token do próprio DRF (`TokenAuthentication`): um usuário e um token; o app manda o token em toda requisição.
- Por enquanto o token fica numa variável de ambiente do Expo (`.env` do mobile, fora do git). Depois vai para o armazenamento seguro do celular (`expo-secure-store`).
- Risco aceito: quem tiver o arquivo do app consegue extrair o token. O token só abre o nosso backend; chaves da Pluggy e senhas de banco nunca vão para o celular.

## 4. App mobile

- Expo Router com abas: Início (resumo), Transações, Cartões (fatura, limite, futuras) e Contas (por banco). O `mobile-ui-expert` detalha cada tela antes do código.
- Chamadas à API com `fetch` num arquivo `api.ts`, usando `useState` e `useEffect`.
- Endereço da API em `EXPO_PUBLIC_API_URL` (RNF02): trocar Docker por servidor caseiro é só mudar o `.env`.

## 5. Ordem de implementação

Cada passo é um commit com testes.

1. Base do mobile: Expo Router e Jest.
2. Backend: models `Conexao`, `Conta` e `Transacao`, mais o admin.
3. Backend: cliente da Pluggy e `sincronizar()` (testes com respostas falsas da Pluggy, sem internet).
4. Backend: token e rotas de contas e transações.
5. Backend: resumo e "posso gastar por dia".
6. Mobile: telas (`mobile-ui-expert` propõe; `mobile-tester` e `react-native-expert` implementam).
7. Backend e mobile: faturas futuras (RF13).
8. Desejáveis (metas, dívidas, filtros...).

Começamos pelo passo 2, porque o backend destrava o resto.
