# Módulo 6: abas e telas Transações, Cartões e Contas

Escrito em 2026-10-17. Atende RF01 a RF03, RF05 a RF07, RF11, RF12 e parte do RF14. Plano (com
as decisões) em [`../../planos/modulo-6-abas-e-telas.md`](../../planos/modulo-6-abas-e-telas.md).
**Antes, estude** [`base-mobile.md`](base-mobile.md) (Expo Router), [`tela-inicio.md`](tela-inicio.md)
e [`atualizar.md`](atualizar.md) (puxar para baixo).

## 1. O que o módulo entrega

- Barra de abas embaixo: Início, Transações, Cartões e Contas.
- **Transações**: as transações de um mês, com setas para trocar de mês; o mês inicial é o mês do
  app (vem do resumo).
- **Cartões**: um bloco por cartão com fatura aberta, limite disponível e vencimento.
- **Contas**: as contas agrupadas por banco, com saldo (corrente) ou fatura aberta (cartão).
- Nas três, puxar para baixo relê os dados (sem sincronizar com a Pluggy, que continua só no
  Início).
- Sem backend novo e sem dependência nova. O app passa a ter 103 testes.

## 2. Conceitos novos

### Grupo de rotas `(abas)`

No Expo Router, uma pasta com nome entre parênteses é um **grupo**: organiza os arquivos, mas não
entra no endereço. `app/(abas)/transacoes.tsx` responde em `/transacoes`, e `app/(abas)/index.tsx`
continua em `/`. O `(abas)/_layout.tsx` diz como as telas do grupo aparecem: aqui, com `Tabs`
(barra de abas). O `_layout.tsx` da raiz continua com a `Stack` (pilha), que agora tem só o
grupo; quando surgir uma tela que abre por cima das abas (ex.: trocar a categoria, RF08), ela
entra nessa pilha.

O `Tabs` vem de `expo-router/js-tabs`: no expo-router 57 instalado, o `Tabs` de `expo-router`
está marcado como obsoleto. Conferido na fonte (`node_modules/expo-router/build/exports.d.ts`).

### Um hook próprio: `useCarga`

As três telas novas fazem a mesma coisa: buscar ao abrir, mostrar carregando ou erro, "Tentar de
novo" e puxar para baixo. Em vez de repetir isso três vezes, `src/useCarga.ts` junta tudo num
**hook**: uma função que usa `useState` e `useEffect` e devolve
`{ estado, recarregar, atualizar, atualizando, falhouAoAtualizar }`. O nome precisa começar com
`use`; é assim que o React e o lint reconhecem um hook.

Cuidado anotado no código: a função de busca passada ao hook precisa ser sempre a mesma entre
renderizações (ex.: `buscarContas`, da `api.ts`). Se fosse uma função nova a cada renderização,
o `useEffect` buscaria sem parar.

### Trocar de mês sem misturar respostas: `key={mes}`

Se a pessoa toca rápido em "Mês anterior" duas vezes, a resposta de outubro pode chegar depois da
de setembro. A tela desenha `<ListaDeTransacoes key={mes} ... />`: quando a `key` muda, o React
joga fora o componente antigo e cria um novo. A limpeza do `useEffect` do componente antigo marca
`ativo = false`, e a resposta atrasada é ignorada.

### Valor calculado em vez de copiado

O mês mostrado é `mesEscolhido ?? resumo.mes`: enquanto a pessoa não tocou nas setas, vale o mês
do resumo. Calcular isso na renderização evita um `useEffect` só para copiar um valor para outro
estado.

### Comparar meses como texto

"2026-09" < "2026-10" funciona comparando o texto, porque o formato tem o ano primeiro e sempre
dois dígitos no mês. É assim que a tela sabe que está no mês atual e desativa "Próximo mês".

## 3. Arquivos

- `src/app/(abas)/_layout.tsx` (novo): as abas, com ícones Lucide (`house`, `arrow-left-right`,
  `credit-card`, `landmark`), barra em `superficie`, aba ativa em `acento`. A altura soma a área
  segura de baixo do celular.
- `src/app/(abas)/index.tsx`: a tela Início, movida de `src/app/index.tsx` sem mudanças.
- `src/app/(abas)/transacoes.tsx`, `cartoes.tsx` e `contas.tsx` (novos): as telas.
- `src/useCarga.ts` (novo): o hook.
- `src/componentes/`: `Carregando`, `MensagemDeErro`, `ListaDeTransacoes`, `ItemDeTransacao`,
  `BlocoDoCartao` e `LinhaDeConta` (novos).
- `src/api.ts`: tipos `Conta` e `Transacao`, `buscarContas()` e `buscarTransacoes(mes)`.
- `src/formatacao.ts`: `mesVizinho("2026-01", -1)` dá `"2025-12"`, só com contas inteiras.
- `docs/design.md`: a seção "Abas" com as abas, os ícones e os endereços.

## 4. Os testes

`cd mobile && npx jest --verbose`. Um ajudante novo, `mobile/testes/ajudantes.ts`, guarda o que as
três telas usam: o servidor falso por endereço, a resposta "segurada" (que só chega quando o
teste manda) e `puxarParaBaixo(testID)`. Ele fica fora de `__tests__/`, então o Jest não o roda
como teste.

- **Abas** (`__tests__/rotas-test.tsx`, com o Router de verdade e um servidor que nunca
  responde): as quatro abas aparecem em ordem; o app abre em `/`; tocar em cada aba leva ao
  endereço certo e mostra o "Carregando..." daquela tela. A aba é achada pelo nome que o leitor de
  tela ouve no iPhone, ex.: "Transações, tab, 2 of 4". (Na primeira rodada, 4 testes falharam
  porque a implementação trocava esse nome por "Transações"; tiramos a troca, porque o nome com a
  posição também é melhor para quem usa leitor de tela.)
- **Transações** (`__tests__/transacoes-test.tsx`): carregando; pede `?mes=2026-10` e mostra
  "Outubro de 2026"; saída, entrada (com o rótulo de acessibilidade) e parcela; "Mês anterior"
  pede setembro e mostra o vazio; "Próximo mês" desativado no mês atual (`toBeDisabled`) e ativo
  em setembro; erro de conexão com o cabeçalho na tela e "Tentar de novo"; puxar para baixo sem
  "Carregando" e sem chamar `/api/sincronizar/`, e o aviso quando falha.
- **Cartões** (`__tests__/cartoes-test.tsx`): carregando; só cartões; fatura e limite;
  vencimento com e sem fechamento; "Limite não informado"; vazio; erro 500 e "Tentar de novo";
  puxar para baixo e o aviso.
- **Contas** (`__tests__/contas-test.tsx`): carregando; grupos na ordem; corrente com "Saldo";
  cartão com "Fatura aberta"; saldo negativo; vazio; erro 401 sem botão; puxar para baixo.
- `__tests__/formatacao-test.ts`: os três exemplos de `mesVizinho`.

Também conferimos que o app monta de verdade com `npx expo export --platform android` (o Jest
não pega, por exemplo, duas rotas no mesmo endereço).

## 5. Testar à mão

`cd mobile && npx expo start --clear` e, no Expo Go: as quatro abas embaixo, a ativa em roxo;
Transações com as setas (a da direita apagada no mês atual); Cartões com o vencimento; Contas
agrupada por banco. Puxe cada tela para baixo.

## 6. Limites

- Categorias em inglês (dúvida aberta).
- Os itens ainda não são tocáveis (trocar categoria é o RF08).
- Ao voltar para uma aba já aberta, ela não recarrega sozinha; é preciso puxar para baixo.
- Sem testes ainda para: falha do resumo inicial em Transações, toques rápidos nas setas e os
  rótulos de acessibilidade de Cartões e Contas.
