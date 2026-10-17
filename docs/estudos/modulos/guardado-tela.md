# Módulo 5b: guardado (tela)

Escrito em 2026-10-17. Mostra na tela Início o que o Módulo 5a calcula (RF04, RF28 e RF29) e
deixa editar o plano de guardar pelo app. **Antes, estude**
[`guardado-backend.md`](guardado-backend.md) (de onde vêm os números) e
[`design-e-edicao.md`](design-e-edicao.md) (a folha de edição, que esta folha copia).

- [Módulo 5b: guardado (tela)](#módulo-5b-guardado-tela)
  - [1. O que o módulo entrega](#1-o-que-o-módulo-entrega)
  - [2. Conceitos novos](#2-conceitos-novos)
  - [3. O caminho de um toque](#3-o-caminho-de-um-toque)
  - [4. Arquivo por arquivo](#4-arquivo-por-arquivo)
  - [5. Os testes, um por um](#5-os-testes-um-por-um)
  - [6. Testar à mão](#6-testar-à-mão)
  - [7. Limites e próximos passos](#7-limites-e-próximos-passos)

## 1. O que o módulo entrega

- Seção "Guardado" logo antes de "Últimos gastos": ícone de cofrinho, total guardado,
  "+ R$ 500,00 este mês" e, com plano, uma barra roxa e "R$ 1.300,00 de R$ 5.800,00 previstos
  em julho de 2027". Sem plano: "Toque para criar um plano de guardar".
- Tocar na seção abre a folha "Plano de guardar", com dois campos: "Quanto por mês" e
  "Até quando (MM/AAAA)". Os dois vazios removem o plano.
- Abaixo do "posso gastar por dia", quando o backend desconta algo: "já separando R$ 200,00
  para guardar".
- O verde saiu do app: "Entrou" usa o roxo do acento (commit separado, antes deste módulo).
- 13 testes novos; o mobile passa a ter 55.

## 2. Conceitos novos

### Combinado entre dois agentes

Desta vez o `mobile-tester` (testes) e o `react-native-expert` (tela) trabalharam ao mesmo
tempo. Para os dois chegarem no mesmo lugar, escrevemos antes um combinado com os nomes das
funções, os textos da tela e os rótulos de acessibilidade. Os testes procuram exatamente esses
textos, então os dois lados precisavam usar as mesmas palavras.

### Barra de progresso acessível

A barra é uma `View` cinza (o trilho) com uma `View` roxa dentro, com largura em porcentagem
(`width: '22%'`). Para o leitor de tela anunciar "22 por cento", a `View` de fora tem:

- `accessible`: vira um elemento só para o leitor de tela (sem isso, a Testing Library também
  não a encontra por papel);
- `accessibilityRole="progressbar"`: diz que é uma barra de progresso;
- `accessibilityValue={{ min: 0, max: 100, now: 22 }}`: o valor que o leitor anuncia.

A largura nunca passa de 100%, mesmo se o progresso passar (guardou mais que o previsto).

### Componente extraído para reaproveitar

As duas folhas precisam do mesmo campo de texto (borda roxa em foco, vermelha com erro). Em vez
de copiar, o campo saiu da `FolhaDeEdicao` para `componentes/CampoDeTexto.tsx`, e as duas folhas
o usam. Pelo mesmo motivo, `mensagemDoErro` foi para `mensagens.ts`, e `rotuloEmReais` e
`tituloDoMes` foram para `formatacao.ts`. O comportamento não mudou; os testes antigos provam
isso, porque continuaram verdes.

### Um resultado que é "plano ou erro"

`lerPlano` (na `FolhaDoPlano`) devolve `{ plano }` quando os campos estão certos ou
`{ erro }` quando não estão. A tela pergunta `'erro' in resultado` para saber qual veio. O
TypeScript entende essa pergunta e, depois dela, sabe qual dos dois formatos está na variável.

### Por que o "já separando" ficou fora do bloco acessível

O número grande do "posso gastar" fica numa `View` com `accessible` e um `accessibilityLabel`;
o leitor de tela lê só esse rótulo e ignora os textos de dentro. Se a linha "já separando"
ficasse lá dentro, ninguém a ouviria. Por isso ela ficou logo abaixo, fora desse bloco.

## 3. O caminho de um toque

1. A tela Início busca `GET /api/resumo/` (como no Módulo 3b-1) e recebe o bloco `guardado`.
2. `index.tsx` passa `resumo.guardado` para a `SecaoGuardado`, que desenha o cartão.
3. Tocar no cartão chama `aoTocar`, que muda `planoAberto` para `true`; a tela mostra a
   `FolhaDoPlano`.
4. A folha aparece e o `useEffect` chama `buscarPlano()` (`GET /api/plano/`). Enquanto espera,
   mostra o indicador; quando chega, preenche os campos ("500,00" e "07/2027", ou vazios).
5. Em "Salvar", `lerPlano` converte o texto: `lerReais("500")` dá `"500.00"` e
   `lerMes("07/2027")` dá `"2027-07"`. Se algum for inválido, a mensagem aparece e o servidor
   nem é chamado.
6. `salvarPlano(...)` faz o `PATCH /api/plano/`. Se o backend recusar (ex.: mês no passado),
   a mensagem dele aparece embaixo dos campos.
7. Deu certo: `aoSalvar` fecha a folha e recarrega o resumo, que já volta com o previsto e o
   desconto novos.

## 4. Arquivo por arquivo

- `src/api.ts`: tipos `PlanoDeGuardar` e `Guardado`, o campo `guardado` no `Resumo`,
  `buscarPlano()` e `salvarPlano()` (usam o mesmo `pedirApi` das configurações).
- `src/formatacao.ts`: `lerMes` ("07/2027" para "2027-07", sem `Date`, como o resto do
  arquivo), `formatarMes` (o contrário) e as duas funções que vieram do `index.tsx`.
- `src/mensagens.ts`: `mensagemDoErro`, que veio da `FolhaDeEdicao`.
- `src/componentes/SecaoGuardado.tsx` (novo): o cartão com a barra.
- `src/componentes/FolhaDoPlano.tsx` (novo): a folha com dois campos.
- `src/componentes/CampoDeTexto.tsx` (novo): o campo reaproveitado pelas duas folhas.
- `src/componentes/FolhaDeEdicao.tsx`: passa a usar o `CampoDeTexto` e o `mensagemDoErro`.
- `src/app/index.tsx`: a seção, o estado `planoAberto`, a folha e a linha "já separando".
- `docs/design.md`: a seção Guardado, a folha do plano e o ícone `piggy-bank`.

## 5. Os testes, um por um

Rodar: `cd mobile && npx jest --verbose`. O dublê do servidor (`ligarServidorFalso`) agora
responde também `/api/plano/`: o `GET` devolve os dois campos `null` e o `PATCH` devolve o
plano salvo. O resumo falso de todos os testes ganhou um `guardado` sem plano, para os testes
antigos continuarem vendo a mesma tela.

### Tela Início (`__tests__/tela-inicio-test.tsx`)

- **Caso 10**, "com plano, mostra o total, o que entrou no mês, a barra e a previsão":
  procura "R$ 1.300,00", "+ R$ 500,00 este mês", a barra pelo papel `progressbar` com valor
  22 (`toHaveAccessibilityValue`) e o texto da previsão.
- **Caso 11**, "sem plano, convida a criar um e não mostra a barra": aparece o convite, e
  `queryByRole('progressbar')` não acha nada. Também confere que não há "previstos em".
- **Caso 12**, "tocar na seção abre a folha...": toca no botão "Guardado: 0,00 reais", espera o
  cabeçalho "Plano de guardar", digita "500" e "07/2027" e salva. Confere que houve um `PATCH`
  só, no endereço `/api/plano/`, com o corpo exato `{"valor_mensal": "500.00", "mes_alvo":
  "2027-07"}`, e que o resumo foi buscado duas vezes (ao abrir e depois de salvar).
- **Caso 13**, "mês em formato errado...": digita um valor válido e "7/27"; aparece "Digite o
  mês como MM/AAAA." e nenhum `PATCH` foi feito. O valor válido é de propósito: assim o único
  erro possível é o do mês.
- **Caso 14**, dois testes: com `falta_guardar_no_mes` "200.00" aparece "já separando R$ 200,00
  para guardar"; com "0.00", não aparece. O segundo já passava antes do código; ele protege
  contra alguém mostrar a linha sempre, por engano.

### Formatação (`__tests__/formatacao-test.ts`)

- `lerMes`: "07/2027" vira "2027-07"; espaços em volta são ignorados; vazio vira `null`;
  "7/27", "13/2027", "00/2027" e "2027-07" lançam erro.
- `formatarMes`: "2027-07" vira "07/2027".

## 6. Testar à mão

Com o backend no ar (`runserver 0.0.0.0:8000`, depois do `migrate` do Módulo 5a) e
`cd mobile && npx expo start --clear`:

1. Na tela Início, a seção "Guardado" aparece antes de "Últimos gastos", com o convite.
2. Toque nela, digite "500" e um mês futuro ("07/2027") e salve: a barra e a previsão
   aparecem, e o "posso gastar" diminui, com a linha "já separando".
3. Abra de novo e digite "7/27": aparece o aviso do formato.
4. Apague os dois campos e salve: o convite volta.

No Android, confira qual teclado abre no campo do mês (o tipo que mostra a barra é do iPhone;
no Android deve abrir o teclado comum).

## 7. Limites e próximos passos

- Para o leitor de tela, o cartão inteiro é um botão "Guardado: 1.300,00 reais"; o texto da
  previsão não é lido. Dá para incluir no rótulo depois, se fizer falta.
- Ainda não há testes para: "este mês" negativo, progresso acima de 100, "Cancelar", valor
  inválido e mensagem de recusa do backend na folha. Ficam sugeridos.
- Próximo: 3b-2 (puxar para baixo e "atualizado às..."), abas e as outras telas.
