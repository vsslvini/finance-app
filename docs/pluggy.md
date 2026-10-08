# Pluggy

O que usamos da Pluggy no projeto, para estudo e para facilitar uma possível troca do serviço.
Cada seção diz de onde veio a informação e quando foi conferida.

Documentação oficial: https://docs.pluggy.ai (índice para leitura: https://docs.pluggy.ai/llms.txt).

## 1. Conceitos

- **Item**: uma conexão com um banco. No nosso código, cada item vira uma `Conexao`.
- **Account**: conta corrente, poupança ou cartão de crédito de um item. Vira uma `Conta`.
- **Transaction**: entrada ou saída de uma conta. Vira uma `Transacao`.
- **Connector**: o "conector" de cada banco na Pluggy. No nosso caso usamos o conector **MeuPluggy**, que lê os bancos já conectados no Meu Pluggy.

## 2. Meu Pluggy (uso pessoal)

Fonte: https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use.md (conferido em 2026-10-06).

- Gratuito, sem análise da empresa, e não expira com o fim do período de teste.
- Até 5 conexões; uso comercial proibido.
- Os dados são atualizados pela Pluggy a cada 24 horas.
- Os itens **não podem ser atualizados manualmente** pela API. Então o nosso "atualizar agora" só relê o que a Pluggy já tem.
- `GET /v2/items` **não funciona** para contas Meu Pluggy: os ids dos itens são copiados do painel (página Demo) e cadastrados no admin do Django.
- Cada banco conectado no Meu Pluggy vira um item separado.

### Passo a passo para obter as credenciais

1. Criar conta em https://meu.pluggy.ai e conectar cada banco (cada um pede a sua autorização no app do banco).
2. Entrar em https://dashboard.pluggy.ai com a **mesma conta** do Meu Pluggy.
3. Em **Applications** (https://dashboard.pluggy.ai/applications), criar uma aplicação, se ainda não houver. Na linha da aplicação ficam o `CLIENT_ID` e o `CLIENT_SECRET`.
4. Se a escolha de conectores estiver personalizada: **Customization → Connectors**, buscar **MeuPluggy** e ativar (aba Direct Connectors, grupo Personal).
5. Em **Applications → sua aplicação → Demo** (clicar em "Iniciar demo"), clicar em **Connect Account** e escolher **MeuPluggy** (não o banco).
   - Se o painel pedir CPF e aprovação no banco de novo, você escolheu o conector do banco em vez do MeuPluggy.
   - O widget deixa escolher **um banco por vez**: repetir o Connect Account para cada banco. Na Demo, todos aparecem com o nome "MeuPluggy" (feito assim em 2026-10-06, com 3 bancos).
6. Na página Demo, clicar em cada item conectado, ver de qual banco são as contas e copiar o id dele.

### Onde guardar

- `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`: só no `.env` da raiz (fora do git). Nunca no app mobile, em log ou em print de tela.
- Ids dos itens: no admin do Django, um cadastro de `Conexao` por banco. O id do item não é segredo (sem o client secret ele não abre nada).

## 3. Autenticação

Fonte: https://docs.pluggy.ai/en/docs/reference/authentication.md (conferido em 2026-10-06).

- `POST https://api.pluggy.ai/auth` com o corpo `{"clientId": "...", "clientSecret": "..."}` devolve `{"apiKey": "..."}`.
- A `apiKey` vale 2 horas e vai em toda chamada no cabeçalho `X-API-KEY`.
- A rota `/auth` tem limite próprio de chamadas: reaproveitar a mesma chave em vez de pedir uma nova a cada chamada.
- Erros: `CLIENT_KEYS_UNAUTHORIZED` (credenciais erradas) e `CLIENT_DISABLED` (aplicação desativada).
- Existe também o **Connect Token** (`POST /connect_token`), usado para conectar bancos pelo widget da Pluggy. Não usamos: os bancos são conectados pelo Meu Pluggy.

## 4. Contas: `GET /accounts?itemId=<id do item>`

Fonte: referência `accounts-list` (MCP `pluggy-docs`, conferido em 2026-10-06).

Resposta: `{"page", "total", "totalPages", "results": [...]}`. Campos de cada conta que nos interessam:

| Campo da Pluggy | Significado | No nosso model |
|---|---|---|
| `id` | id da conta | `Conta.id_pluggy` |
| `type` | `BANK` (corrente ou poupança) ou `CREDIT` (cartão) | `Conta.tipo` |
| `subtype` | `CHECKING_ACCOUNT`, `SAVINGS_ACCOUNT` ou `CREDIT_CARD` | |
| `name` | nome da conta (ex.: "Conta Corrente", "Mastercard Black") | `Conta.nome` |
| `balance` | saldo; no cartão, é a fatura aberta | `Conta.saldo` |
| `creditData.creditLimit` | limite total do cartão | `Conta.limite_total` |
| `creditData.availableCreditLimit` | limite disponível | `Conta.limite_disponivel` |
| `creditData.balanceCloseDate` | data de fechamento (data e hora) | `Conta.data_fechamento` |
| `creditData.balanceDueDate` | data de vencimento (data e hora) | `Conta.data_vencimento` |
| `bankData.reservedBalances` | caixinhas, quando o banco informa (RF04, para depois) | |

## 5. Transações: `GET /v2/transactions?accountId=<id da conta>`

Fontes: referência `transactions-list-by-cursor` e guia `products/transactions` (MCP `pluggy-docs`, conferido em 2026-10-06).

- A rota antiga `GET /transactions` (paginada por número de página) está marcada como **obsoleta**. A nova é `/v2/transactions`.
- Paginação por cursor: a resposta é `{"results": [...], "next": "?accountId=...&after=..."}`. Se `next` vier preenchido, chamar de novo `GET /v2/transactions` + `next`; se vier `null`, acabou. No máximo 500 por página.
- Filtros opcionais: `dateFrom` e `dateTo` (formato `aaaa-mm-dd`).

Campos que nos interessam:

| Campo da Pluggy | Significado | No nosso model |
|---|---|---|
| `id` | id da transação | `Transacao.id_pluggy` |
| `date` | data em UTC (ex.: `2020-10-14T00:00:00.000Z`) | `Transacao.data` |
| `description` | descrição já limpa | `Transacao.descricao` |
| `amount` | valor (ver sinais abaixo) | `Transacao.valor` |
| `type` | `DEBIT` (saiu dinheiro) ou `CREDIT` (entrou) | sinal de `Transacao.valor` |
| `status` | `POSTED` (confirmada) ou `PENDING` (ainda não fechou, ex.: fatura aberta e parcelas futuras) | |
| `category` | categoria; **exige assinatura Pro**, pode vir vazia | `Transacao.categoria_pluggy` |
| `creditCardMetadata.installmentNumber` | número da parcela | `Transacao.parcela_atual` |
| `creditCardMetadata.totalInstallments` | total de parcelas | `Transacao.total_parcelas` |

Sinais do `amount`:

- Conta bancária: negativo é saída, positivo é entrada.
- Cartão de crédito: **ao contrário**. Positivo é compra (você deve mais); negativo é pagamento da fatura.
- O campo `type` já vem normalizado: compra no cartão é sempre `DEBIT`, pagamento da fatura é sempre `CREDIT`.

### O id da transação pode mudar

Na maioria das mudanças (inclusive `PENDING` para `POSTED`), a Pluggy mantém o mesmo `id`. Mas, se data, descrição ou valor mudarem muito, ela **apaga a transação e cria outra com id novo**, sem ligar uma à outra. Quem usa webhooks recebe o aviso `transactions/deleted`; quem só lê a lista precisa perceber sozinho que um id sumiu. Uma transação apagada também pode reaparecer depois.

## 6. Limites

Fonte: guia `developer-tools/rate-limits` (conferido em 2026-10-06).

- `POST /auth`, `GET /accounts` e `GET /transactions`: até 360 chamadas por minuto, por IP.

## 7. O que vimos no teste real (2026-10-07)

Primeira execução de `sincronizar()` com os dados reais do Meu Pluggy (Nubank, Inter e
PicPay). Funcionou sem erro: 3 conexões, 7 contas e 1187 transações.

- **`/v2/transactions` funciona no Meu Pluggy**, com paginação pelo `next`.
- **Histórico:** cerca de 12 meses no Nubank e no Inter (desde 2025-10); no PicPay, só
  desde 2026-07.
- **Sinal pelo `type` confirmado:** pagamento de fatura vem positivo no cartão e negativo
  na conta corrente; salário e cashback vêm positivos; delivery vem negativo. Nenhuma
  transação com valor zero.
- **Categorias vêm em inglês** no campo `category` (ex.: `"Food delivery"`, `"Salary"`),
  em quase todas as transações (só 5 de 1187 sem categoria). A tradução não vem na
  transação: a documentação diz que cada transação traz um `categoryId`, e o
  `GET /categories` devolve a lista com `description` (inglês) e `descriptionTranslated`
  (português). Fonte: guia `products/transaction-categorization` (conferido em
  2026-10-07). Isso corrige a anotação antiga de que as categorias viriam em português.
- **`balanceCloseDate` (data de fechamento) veio vazio nos 3 cartões**; o
  `balanceDueDate` (vencimento) veio. O Q&A da Pluggy ("Dados Fatura Atual Cartão de
  Crédito - Nubank", conferido em 2026-10-07) diz que, no Open Finance, a fatura aberta não
  traz esses dados até fechar, e indica a rota `/bills` para os detalhes de cada fatura.
- **Parcelas futuras aparecem como transações com data futura** (ex.: parcela 4 de 4 em
  2027-01-05 no cartão do Nubank). O Q&A ("Dados de transações faltantes/divergentes", mesma
  data) também diz que, no cartão, compras novas aparecem primeiro como pendentes, e que
  parcelas de compras antigas só aparecem depois do fechamento ou vencimento da fatura. Ou
  seja: o que vem não é a lista completa de parcelas futuras.
- **O Inter devolveu duas contas `BANK`**: uma com transações e outra com saldo e nenhuma
  transação. Não guardamos o `subtype`, então ainda não sabemos o que é a segunda (pode ser
  poupança ou outra conta do mesmo banco).
- **Nenhuma conta foi pulada** por tipo desconhecido: todas vieram como `BANK` ou `CREDIT`.
