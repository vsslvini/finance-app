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

App Django `financas` para os dados dos bancos. Metas e dívidas entram depois, num app `planejamento`.

### Models

| Model | Para que serve | Campos principais |
|---|---|---|
| `Conexao` | um banco conectado no Meu Pluggy | id da Pluggy, nome do banco, última atualização |
| `Conta` | conta corrente ou cartão | conexão, tipo, nome, saldo; no cartão: limite total, limite disponível, fechamento, vencimento |
| `Transacao` | cada entrada ou saída | conta, data, descrição, valor, categoria da Pluggy, categoria manual, parcela X de Y, id da Pluggy (vazio se manual) |

- Os ids das conexões (copiados do painel da Pluggy) são cadastrados pelo admin do Django.
- Valores em dinheiro usam `DecimalField`, exato até o centavo (RNF04).
- Transação sem categoria aparece como "Sem categoria".

### Sincronização

Função `sincronizar()`: para cada conexão, busca na Pluggy contas e transações e cria ou atualiza as linhas no nosso banco. É chamada por `POST /api/sincronizar/` (puxar a tela para baixo), respeitando o limite de uma vez por hora. A atualização automática (RF25) chama a mesma função, mais tarde.

Chamadas HTTP à Pluggy com a biblioteca `requests`. Os detalhes das rotas da Pluggy são conferidos na documentação durante a implementação.

### Rotas da API

| Rota | Requisitos |
|---|---|
| `GET /api/resumo/?mes=2026-10` | saldo total, entradas, saídas, posso gastar por dia, últimos gastos (RF15 a RF18) |
| `GET /api/contas/` | contas agrupadas por banco, com dados do cartão (RF01 a RF03, RF11, RF12, RF14) |
| `GET /api/transacoes/?mes=...` | transações do mês, com filtros opcionais (RF05 a RF07, RF09) |
| `PATCH /api/transacoes/<id>/` | trocar a categoria (RF08) |
| `POST /api/transacoes/` | gasto manual (RF10) |
| `GET /api/faturas-futuras/` | estimativa por mês (RF13) |
| `POST /api/sincronizar/` | atualizar agora (RF24) |

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
