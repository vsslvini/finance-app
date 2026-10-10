# Módulo 3b-1: tela Início mostra o resumo

Escrito em 2026-10-10. Primeira tela de verdade do app (passo 6 da arquitetura) e atende
RF15 a RF18 no celular. **Antes, estude** [`base-mobile.md`](base-mobile.md) e
[`../jest.md`](../jest.md), seções 10 a 14 (mocks, `beforeEach`, `findBy`, relógio falso).
Do lado do backend, ajuda ter visto [`resumo-do-mes.md`](resumo-do-mes.md), seção 1 (o
formato da resposta).

- [Módulo 3b-1: tela Início mostra o resumo](#módulo-3b-1-tela-início-mostra-o-resumo)
  - [1. O que o módulo entrega](#1-o-que-o-módulo-entrega)
  - [2. Conceitos novos](#2-conceitos-novos)
  - [3. O caminho de uma abertura do app](#3-o-caminho-de-uma-abertura-do-app)
  - [4. Arquivo por arquivo](#4-arquivo-por-arquivo)
  - [5. Os testes, um por um](#5-os-testes-um-por-um)
  - [6. Testar à mão (com os seus dados reais)](#6-testar-à-mão-com-os-seus-dados-reais)
  - [7. Limites e próximos passos](#7-limites-e-próximos-passos)
  - [8. Para estudar mais](#8-para-estudar-mais)

## 1. O que o módulo entrega

- A tela Início busca `GET /api/resumo/` no backend e mostra: o mês atual, o "posso gastar por
  dia" em destaque, saldo total e fatura aberta, entradas e saídas, e os últimos gastos.
- Estados: carregando; erro de conexão (com "Tentar de novo"); token recusado (sem botão);
  erro do servidor (com botão); mês sem gastos; "posso gastar" negativo (com aviso).
- O backend passa a aceitar pedidos pelo IP da rede (`DJANGO_ALLOWED_HOSTS` no `.env`).
- 17 testes novos no mobile (18 no total); backend continua com 68.

A proposta da tela (ordem das informações, cores, acessibilidade) foi feita pelo
`mobile-ui-expert` e aprovada em 2026-10-10.

## 2. Conceitos novos

### `useState`: a memória da tela

```tsx
const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
```

`estado` é o valor atual; `setEstado(novo)` troca o valor **e** faz o React desenhar a tela de
novo. A tela nunca é "editada" à mão: ela é sempre redesenhada a partir do estado.

O nosso estado tem três formas, e só uma por vez:

```tsx
type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; erro: TipoErroApi }
  | { tipo: 'sucesso'; resumo: Resumo };
```

O `|` quer dizer "ou". Assim é impossível a tela estar "carregando e com erro" ao mesmo tempo,
o que aconteceria com três variáveis soltas (`carregando`, `erro`, `dados`).

### `useEffect`: fazer algo quando a tela aparece

```tsx
useEffect(() => {
  let ativo = true;
  carregarEstado().then((novoEstado) => {
    if (ativo) setEstado(novoEstado);
  });
  return () => { ativo = false; };
}, []);
```

- O `[]` no fim quer dizer "rode uma vez, quando a tela aparece".
- A função devolvida no `return` roda quando a tela **sai**. Ela marca `ativo = false`, para
  que uma resposta que chegue depois não mexa numa tela que já não existe.

### Promise, `async` e `await`

O pedido ao backend demora. Em vez de travar o app esperando, o `fetch` devolve uma Promise
(uma "promessa" de resposta). `await` espera a promessa dentro de uma função `async`, e
`.then(...)` diz "quando chegar, faça isto". É o mesmo conceito dos testes
([`../jest.md`](../jest.md), seção 5).

### Variáveis `EXPO_PUBLIC_`

Fonte: https://docs.expo.dev/guides/environment-variables/ (conferido em 2026-10-10).

O Expo lê o `mobile/.env` e **copia** o valor das variáveis que começam com `EXPO_PUBLIC_`
para dentro do código do app, no lugar de `process.env.EXPO_PUBLIC_X`. Duas consequências:

- só a forma com ponto funciona (`process.env.EXPO_PUBLIC_API_URL`); colchetes ou
  desestruturação não são trocados;
- o valor fica **visível** dentro do app instalado. Por isso só o token do nosso backend vai
  ali, nunca chaves da Pluggy (risco aceito em 2026-10-04).

Ao mudar o `mobile/.env`, reinicie o `npx expo start` para o valor novo entrar.

### Limite de tempo com `AbortController`

O `fetch` não tem limite de tempo próprio. O `AbortController` é um "botão de cancelar":
entregamos o `signal` dele ao `fetch` e um `setTimeout` aperta o botão depois de 15 segundos.
O `fetch` cancelado falha, e a tela mostra o erro de conexão em vez de girar para sempre.

### Dinheiro sem `Number`

A API manda `"1830.45"` como texto. Converter para `Number` pode criar erros de centavo (o
mesmo motivo do `Decimal` no backend, RNF04). O `formatarNumero` trabalha só com o texto:
separa sinal, inteiro e centavos e põe os pontos de milhar.

### `ALLOWED_HOSTS` do Django

A cada pedido, o Django confere o endereço usado (o cabeçalho `Host`) contra a lista
`ALLOWED_HOSTS`. Se o celular pede `http://192.168.80.118:8000/...` e esse IP não está na
lista, a resposta é **400 (Bad Request)**. Agora a lista vem do `.env`
(`DJANGO_ALLOWED_HOSTS`), separada por vírgula e **sem espaços** (o django-environ não tira
os espaços).

## 3. O caminho de uma abertura do app

```
App abre ─► Router mostra src/app/index.tsx (estado: carregando)
              │
              └─ useEffect ─► carregarEstado() ─► buscarResumo() (src/api.ts)
                                                    │
                     fetch(EXPO_PUBLIC_API_URL + "/api/resumo/",
                           Authorization: Token EXPO_PUBLIC_API_TOKEN)
                                                    │
              Wi-Fi ─► firewall (porta 8000) ─► runserver 0.0.0.0:8000
                                                    │
                     ALLOWED_HOSTS ─► token ─► views.resumo ─► services/resumo.py
                                                    │
              JSON ◄────────────────────────────────┘
                │
   200 ─► { tipo: 'sucesso' } ─► tela com os valores (formatacao.ts)
   401 ─► { tipo: 'erro', erro: 'token' }
   500 ─► { tipo: 'erro', erro: 'servidor' }
   sem resposta / 15 s ─► { tipo: 'erro', erro: 'conexao' }
```

## 4. Arquivo por arquivo

### `backend/config/settings.py` e `.env.example` (alterados)

`ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])`. Sem a
variável no `.env`, vale o padrão de antes. Sem teste unitário: é configuração, conferida à mão
(seção 6).

### `mobile/.env.example` (novo)

Modelo do `mobile/.env`: `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_API_TOKEN`, sem valores reais. O
`.gitignore` da raiz ignora `.env` em qualquer pasta, então o `mobile/.env` não vai para o git.

### `mobile/src/formatacao.ts` (novo)

`formatarNumero`, `formatarReais`, `formatarData` e `nomeDoMes`. Funções puras (mesma entrada,
mesma saída, sem efeito externo), por isso fáceis de testar sozinhas.

### `mobile/src/api.ts` (novo)

- Tipos `Resumo` e `GastoResumo`, iguais aos serializers do backend.
- `ErroApi`, um erro com `tipo` (`conexao`, `token` ou `servidor`), para a tela escolher a
  mensagem.
- `buscarResumo()`: o pedido, o limite de 15 s e a tradução de status em tipo de erro.

É a primeira peça do `api.ts` previsto na arquitetura; as próximas telas acrescentam funções
aqui.

### `mobile/src/app/index.tsx` (reescrito)

A tela: o estado, o `useEffect`, as três "caras" (carregando, erro, sucesso), os cartões e a
lista. `rotuloEmReais` monta os textos do leitor de tela ("Saídas do mês: 1.830,45 reais";
negativo vira "menos ..."). A lista usa `map` e não `FlatList`, porque são no máximo 5 itens.

### Testes

- `mobile/__tests__/formatacao-test.ts` (novo): casos 1 a 6.
- `mobile/__tests__/tela-inicio-test.tsx` (novo): casos 7 a 17.
- `mobile/__tests__/rotas-test.tsx` (ajustado): agora troca o `fetch` por um que nunca
  responde e procura "Carregando o resumo..." (antes procurava "Início", que não existe mais).
- `mobile/__tests__/inicio-test.tsx` (apagado): o caso dele ("a tela inicial abre") passou a
  ser coberto pelo caso 7, com a tela nova.

## 5. Os testes, um por um

Rodar só os testes deste módulo:
`cd mobile && npx jest __tests__/formatacao-test.ts __tests__/tela-inicio-test.tsx --verbose`

### Formatação (`formatacao-test.ts`, sem tela)

1. **"1250.50" vira "R$ 1.250,50".** O formato que aparece em todo o app.
2. **"1234567.89" vira "R$ 1.234.567,89".** Um ponto a cada três dígitos, não só no primeiro
   milhar.
3. **"0.00" vira "R$ 0,00" e "999.99" vira "R$ 999,99".** Os dois lados do limite: zero e o
   maior valor sem ponto de milhar.
4. **"-45.90" vira "- R$ 45,90".** O sinal fica antes do "R$", com espaço (decisão de
   2026-10-10).
5. **"2026-10-08" vira "08/10".** Pega a armadilha do fuso: `new Date("2026-10-08")` seria dia
   07 em Brasília. Atenção: o teste só pega esse erro se o computador estiver no fuso do
   Brasil (o seu está).
6. **Mês 10 de 2026 vira "Outubro de 2026".** O mês vai de 1 a 12.

### Tela (`tela-inicio-test.tsx`, com `fetch` falso)

Todos começam com o `beforeEach`: `fetch` falso novo, endereço `http://servidor-falso:8000` e
token `token-falso`. O `afterEach` devolve tudo como estava ([`../jest.md`](../jest.md),
seções 10 e 11).

7. **Carregando.** O `fetch` nunca responde; aparece "Carregando o resumo...".
8. **Mês e totais.** Com a resposta de exemplo, espera `R$ 1.250,50` aparecer (`findByText`) e
   confere o título do mês atual, "Posso gastar por dia", `R$ 31,31`, `R$ 499,90`,
   `+ R$ 3.000,00` e `- R$ 1.830,45`. O título esperado é calculado com `new Date()`, para o
   teste valer em qualquer mês.
9. **Gastos na ordem da API.** Confere descrição, valor e "08/10 · Nubank · Groceries" de cada
   gasto; depois `getAllByText(/ · /)` pega as linhas de detalhe de cima para baixo e confere
   que Mercado vem antes de Uber.
10. **Sem gastos.** Com `ultimos_gastos: []`, aparece "Nenhum gasto neste mês ainda." e os
    totais continuam.
11. **Posso gastar negativo.** Com `"-10.00"`, aparecem "- R$ 10,00" e "A fatura aberta é
    maior que o saldo."
12. **Endereço e token.** Lê `fetchFalso.mock.calls[0]` e confere o endereço
    `http://servidor-falso:8000/api/resumo/` e o cabeçalho `Authorization: Token token-falso`.
    É isso que faz o backend aceitar o pedido.
13. **Sem conexão e tentar de novo.** A 1ª chamada falha, a 2ª dá certo. Aparece a mensagem
    de conexão; o teste toca em "Tentar de novo" e confere que o resumo aparece e que o
    `fetch` foi chamado 2 vezes.
14. **401.** Aparece a mensagem do token, e `queryByText('Tentar de novo')` é `null`.
15. **500.** Aparecem a mensagem do servidor e o botão.
16. **15 segundos.** Testa o `buscarResumo()` direto, com relógio falso: em 14999 ms ainda não
    cancelou; em 15000 ms falha com tipo `conexao` ([`../jest.md`](../jest.md), seção 14).
17. **Leitor de tela.** Existe um elemento com o rótulo "Saídas do mês: 1.830,45 reais".

### Rotas (`rotas-test.tsx`)

O mesmo teste do 3a ("o Router encontra a tela inicial pelo arquivo"), agora conferindo
"Carregando o resumo...", o primeiro estado da tela nova.

### Ver o vermelho

Troque `'R$ 31,31'` por `'R$ 31,32'` no caso 8 e rode: o erro esperado é
`Unable to find an element with text: R$ 31,32`. Depois, desfaça.

## 6. Testar à mão (com os seus dados reais)

Uma vez só:

1. **Descubra o IP do computador no Wi-Fi:** `ip -4 -br addr`, linha `wlo1` (hoje
   `192.168.80.118`; pode mudar se o roteador reiniciar).
2. **Backend aceitar o IP:** no `.env` da **raiz**, acrescente
   `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,192.168.80.118` (sem espaços).
3. **Firewall:** libere a porta 8000 só para a rede de casa:
   `sudo ufw allow from 192.168.80.0/24 to any port 8000 proto tcp comment 'Django dev'`.
4. **Token:** dentro de `backend/`, `python manage.py drf_create_token <usuário>` (sem `-r`,
   mostra o token que já existe).
5. **App:** `cp mobile/.env.example mobile/.env` e preencha
   `EXPO_PUBLIC_API_URL=http://192.168.80.118:8000` e `EXPO_PUBLIC_API_TOKEN=<o token>`.

Toda vez:

1. `docker compose up -d` (banco).
2. `cd backend && python manage.py runserver 0.0.0.0:8000`. O `0.0.0.0` faz o Django escutar
   na rede, e não só no próprio computador.
3. Conferir pelo navegador do celular: `http://192.168.80.118:8000/api/health/` deve responder.
   Se der **400**, o IP não está no `DJANGO_ALLOWED_HOSTS`; se não carregar, é o firewall ou o
   `0.0.0.0`.
4. `cd mobile && npx expo start --clear` e abrir no Expo Go.

O que esperar: o nome do mês, o "posso gastar por dia" e os seus valores reais. Se aparecer
"Acesso negado pelo servidor", confira o token no `mobile/.env` e reinicie o `expo start`.

**Segurança:** com `0.0.0.0` e a porta liberada, outros aparelhos da sua rede alcançam o
Django. A API exige token, mas `/api/health/` e a página de login do `/admin/` ficam visíveis.
Use só em casa, e a regra do `ufw` limitada a `192.168.80.0/24` impede o acesso de outras
redes.

## 7. Limites e próximos passos

- Ainda **não** tem "puxar para baixo" nem "Atualizado às..." (Módulo 3b-2).
- A categoria aparece em inglês ("Groceries"), como vem da Pluggy (dúvida em aberto).
- O cartão "Posso gastar por dia" some se o backend mandar `null` (só acontece fora do mês
  atual); esse comportamento existe, mas não tem teste (não estava nos casos aprovados).
- Em modo de desenvolvimento, o React pode chamar o `useEffect` duas vezes e fazer dois pedidos
  ao backend. É normal e não acontece no app final.
- O plano de guardar (pedido em 2026-10-10) entra no Módulo 4 e ganha um bloco nesta tela.

## 8. Para estudar mais

- React, `useState` e `useEffect`: https://react.dev/learn/state-a-components-memory e
  https://react.dev/learn/synchronizing-with-effects
- Variáveis de ambiente no Expo: https://docs.expo.dev/guides/environment-variables/
- `AbortController` (MDN): https://developer.mozilla.org/pt-BR/docs/Web/API/AbortController
- `ALLOWED_HOSTS`: https://docs.djangoproject.com/en/6.1/ref/settings/#allowed-hosts
