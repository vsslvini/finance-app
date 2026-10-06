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

## 4. Rotas que vamos usar

(a detalhar no passo 3 da arquitetura, conferindo o formato das respostas)

- `GET /accounts?itemId=<id do item>`: contas de um item.
- `GET /transactions?accountId=<id da conta>`: transações de uma conta.
