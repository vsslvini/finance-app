# Guia de design do app

Especificação visual do app mobile. Toda tela nova segue este arquivo; quem decide o que
entra aqui é o Vinicius.

- **Estado:** preenchido a partir de prints em 10/10/2026
- **Como preencher:** troque os valores das tabelas e listas, mantendo os nomes dos campos
  (o código vai usar esses nomes). Campo sem decisão fica com `a definir`.
- **Limites do React Native:** cores em hexadecimal (`#RRGGBB`); medidas em pontos (dp), sem
  `rem` nem `%` de fonte; fontes do Google Fonts (pedem o pacote `expo-font`) ou a fonte do
  sistema; sombras e desfoques simples; gradiente só com dependência nova.

- [Guia de design do app](#guia-de-design-do-app)
  - [1. Identidade](#1-identidade)
  - [2. Referências](#2-referências)
  - [3. Tema](#3-tema)
  - [4. Cores](#4-cores)
  - [5. Tipografia](#5-tipografia)
  - [6. Espaçamento, cantos e bordas](#6-espaçamento-cantos-e-bordas)
  - [7. Componentes](#7-componentes)
  - [8. Estados da tela](#8-estados-da-tela)
  - [9. Ícones e imagens](#9-ícones-e-imagens)
  - [10. Movimento](#10-movimento)
  - [11. Acessibilidade](#11-acessibilidade)
  - [12. Textos e formatos](#12-textos-e-formatos)
  - [13. O que evitar](#13-o-que-evitar)
  - [14. Dúvidas em aberto](#14-dúvidas-em-aberto)

## 1. Identidade

| Campo | Valor |
|---|---|
| Nome do app | a definir |
| Personalidade (3 a 5 palavras) | calmo, direto, confiável, sem pressa |
| Sensação ao abrir | "sei em 2 segundos quanto posso gastar hoje" |
| Informação principal da tela Início | posso gastar por dia |

## 2. Referências

Uma linha por print ou app de referência.

| Referência | O que pegar | O que não pegar |
|---|---|---|
| Estilo B da página de comparação | fundo escuro, número grande do dia, régua de dias do mês, cores suaves | a definir |
| Estilo C da página de comparação | ícones coloridos por categoria nos gastos | fundo creme, cantos muito redondos |
| Copilot Money | calma, números em destaque, pouca informação por vez | a definir |
| Print 1 (três telas escuras com verde: Início, Transferências, Pagamentos) | fundo quase preto com cartões em cinza um pouco mais claro e sem borda; um único verde como cor de ação; botão principal cheio e botão secundário só com contorno, ambos arredondados; lista de movimentações agrupada por dia ("Hoje", "Ontem") com valor à direita; barra fina de várias cores como resumo de gastos do mês; barra de abas embaixo com ícones de contorno e a aba ativa em verde; campo de busca arredondado com ícone à esquerda | textura de ondas e brilho no cartão de saldo (é gradiente); vidro fosco e desfoque nas folhas; fotos de rosto nos itens; muitos blocos de atalho na mesma tela |
| Print 2 (três telas escuras com amarelo-limão: boas-vindas, painel, estatística) | número de saldo grande com a variação pequena logo abaixo ("+2,5% este mês"); blocos em grade de duas colunas, cada um com ícone pequeno, rótulo, valor e variação; ideia de destacar só um bloco com cor cheia; lista de transações com marca de situação à direita; cantos generosos e botões em formato de pílula | o amarelo-limão (vivo demais para o tom calmo); tela de boas-vindas com estrelas e linhas curvas; mockups inclinados; gráfico de área com preenchimento em degradê; filtro "Mês" em formato de menu |

## 3. Tema

| Campo | Valor |
|---|---|
| Tema principal | escuro |
| Tema claro | depois (a definir se segue o tema do celular) |
| Barra de status do celular | texto claro |

## 4. Cores

Nomes dos campos = nomes dos tokens no código.

### Base

| Token | Uso | Valor |
|---|---|---|
| `fundo` | fundo da tela | `#0F1214` |
| `superficie` | cartões | `#181C1F` |
| `superficieElevada` | folhas de edição, modais | `#20252A` |
| `borda` | divisórias e contornos | `#262C31` |
| `texto` | texto principal | `#ECEFF1` |
| `textoSecundario` | rótulos, datas, detalhes | `#A3ABB2` |
| `textoTerciario` | dicas, textos desativados | `#8B949B` |
| `acento` | botões, links, barras de progresso | `#A78BFA` (roxo, escolhido em 2026-10-10; 6,9:1 sobre o fundo) |
| `textoSobreAcento` | texto em cima do `acento` | `#0F1214` |
| `fundoEscurecido` | camada atrás das folhas de edição | `#000000` com 60% de opacidade (`rgba(0, 0, 0, 0.6)`), exceção à regra do hexadecimal |

### Significado (não são a cor de acento)

| Token | Uso | Valor |
|---|---|---|
| `positivo` | entradas, valores bons | `#A78BFA` (o mesmo roxo do `acento`, desde 2026-10-17) |
| `negativo` | saídas, valores ruins | `#F2796F` |
| `aviso` | avisos (ex.: fatura acima do limite) | `#F2B84B` |
| `avisoFundo` | fundo da faixa de aviso | `#1E1A10` |
| `avisoBorda` | contorno da faixa de aviso | `#6B4F1D` |
| `erro` | mensagens de erro | `#F2796F` |

### Categorias (ícone dos gastos, inspirado no estilo C)

| Categoria | Fundo do ícone | Cor do ícone |
|---|---|---|
| Mercado | `#2E2810` | `#F2D26B` |
| Restaurantes | `#33200F` | `#F5A56B` |
| Transporte | `#12263A` | `#6DB6F2` |
| Outras / Sem categoria | `#20252A` | `#A3ABB2` |

### Régua de dias do mês

| Token | Uso | Valor |
|---|---|---|
| `diaPassado` | dias que já passaram | `#5B4AA8` |
| `diaHoje` | hoje | `#A78BFA` |
| `diaFuturo` | dias que faltam | `#2A3036` |

## 5. Tipografia

| Campo | Valor |
|---|---|
| Família principal | Manrope (Google Fonts) |
| Família reserva | fonte do sistema |
| Números alinhados (tabular) | sim, em todo valor em dinheiro |

| Estilo | Uso | Tamanho | Peso | Altura de linha | Extra |
|---|---|---|---|---|---|
| `numeroDestaque` | posso gastar por dia | 44 | 800 | 46 | espaçamento -1; centavos em 18, peso 600, `textoSecundario` |
| `titulo` | nome do mês | 13 | 600 | 18 | MAIÚSCULAS, espaçamento 0.5, `textoSecundario` |
| `subtitulo` | "Últimos gastos" | 15 | 700 | 20 | |
| `valor` | valores dos cartões | 16 | 700 | 22 | |
| `corpo` | texto comum, descrição do gasto | 15 | 500 | 21 | |
| `rotulo` | rótulos dos cartões | 12 | 500 | 16 | `textoSecundario` |
| `detalhe` | data, banco, categoria | 12 | 400 | 16 | `textoTerciario` |
| `botao` | texto de botões | 15 | 700 | 20 | |

## 6. Espaçamento, cantos e bordas

| Campo | Valor |
|---|---|
| Escala de espaçamento | 4, 8, 12, 16, 24, 32 |
| Margem lateral da tela | 16 |
| Espaço entre blocos | 12 |
| Respiro interno dos cartões | 16 |
| Canto dos cartões | 16 |
| Canto de botões | 24 (formato de pílula, com altura mínima de 48) |
| Canto de ícones de categoria | 15 (círculo, com ícone de 30x30) |
| Canto de faixas de aviso | 12 |
| Bordas | só na faixa de aviso, em divisórias de lista e no botão secundário (1) |
| Sombras | nenhuma (no escuro, a diferença de cor separa os blocos) |

## 7. Componentes

Para cada componente: aparência e regras. O que não estiver aqui segue os tokens acima.

### Destaque "posso gastar"
- Sem cartão (direto no fundo), número em `numeroDestaque`.
- Embaixo, a régua de dias do mês (um traço por dia; altura 18, canto 3, espaço 3).
- Linha de detalhe: "dia 10 de 31" (a hora da atualização fica embaixo do título do mês, ver seção 8).

### Cartão de par (saldo e fatura; entradas e saídas)
- Dois cartões lado a lado, `superficie`, canto 16, espaço 12 entre eles.
- Rótulo em cima (`rotulo`), valor embaixo (`valor`). Pode haver uma linha pequena de variação em `detalhe` (ex.: "+2,5% este mês", sempre com sinal).
- Cartão Entrou: tocável, abre a edição do início do mês; cartão Fatura aberta: tocável, abre o limite da fatura (ver "Folha de edição"). Saldo não é tocável.

### Faixa de aviso
- `avisoFundo`, contorno `avisoBorda`, texto `aviso`, canto 12.

### Bloco de meta (plano de guardar)
- `superficie`, canto 16; título, barra de progresso (altura 8, `acento` sobre `diaFuturo`) e texto "R$ X de R$ Y".

### Seção Guardado (tela Início, antes de "Últimos gastos")
- Um cartão só, `superficie`, canto 16, tocável inteiro: abre a folha "Plano de guardar".
- Rótulo "Guardado" com ícone `piggy-bank`; total em `valor`; embaixo, a variação do mês em
  `detalhe` com sinal ("+ R$ 500,00 este mês" em `positivo`, "- R$ 100,00 este mês" em `negativo`).
- Com plano: barra do bloco de meta (altura 8, canto 4, `acento` sobre `diaFuturo`, nunca passa
  de 100%) e o texto "R$ 1.300,00 de R$ 5.800,00 previstos em julho de 2027" em `rotulo`.
- Sem plano: no lugar da barra, "Toque para criar um plano de guardar" em `rotulo` com cor `acento`.
- Com desconto do plano, o destaque "posso gastar" ganha uma linha em `detalhe` logo abaixo do
  número: "já separando R$ 200,00 para guardar".

### Seção Próximas faturas (aba Cartões, embaixo dos cartões)
- Só aparece quando há pelo menos um cartão.
- Título "Próximas faturas" em `subtitulo` (header) e, embaixo, a explicação "Estimativa pelas
  compras parceladas que a Pluggy enviou." em `detalhe`.
- Um cartão só, `superficie`, canto 16, com uma linha por mês (os 6 próximos): nome do mês em
  `corpo` à esquerda ("Novembro de 2026") e total em `valor` à direita ("R$ 245,30"); divisória
  de 1 em `borda` entre os meses.
- Mês com mais de um cartão: embaixo da linha, uma linha por cartão em `detalhe` ("Inter: R$ 77,07").
- Todos os meses zerados: no lugar das linhas, "Nenhuma parcela futura encontrada." em
  `textoSecundario`, centralizado.

### Tela Relatório (`/relatorio`, desde 2026-10-17, Módulo 9b)
- Aberta pelo botão secundário "Ver relatório do mês" do Início (logo depois de Entrou e Saiu).
  Fica por cima das abas (sem a barra de abas).
- Topo: botão "Voltar" (`chevron-left`, 24, área de toque 44x44) e o título "Relatório" em
  `titulo`. Embaixo, as setas de mês da tela Transações, com o nome do mês em `titulo`.
- Cartões de par "Entrou" (`+`, `positivo`) e "Saiu" (`-`, `negativo`) e, embaixo, o cartão
  "Saldo do mês" (ícone `scale`), com sinal e cor do valor (`positivo` ou `negativo`).
- "Gastos por categoria" em `subtitulo`, a frase "Inclui as compras do cartão; por isso pode ser
  diferente do Saiu." em `detalhe` e "Total de gastos: R$ X" em `corpo`. Um cartão com uma linha
  por categoria: ícone de categoria, nome em `corpo`, valor em `valor` e a porcentagem em
  `rotulo` à direita; embaixo, a barra do bloco de meta (altura 8, `acento` sobre `diaFuturo`);
  divisória de 1 em `borda` entre as linhas.
- "Maiores gastos" em `subtitulo`, com os itens da lista de gastos, mas sem toque.
- Mês sem gastos: no lugar das duas seções, "Nenhum gasto neste mês." em `textoSecundario`.

### Aba Dívidas (`/dividas`, desde 2026-10-18, Módulo 12b)
- Título "Dívidas" em `titulo`; se o puxar para baixo falhar, "Não foi possível atualizar agora." em
  `detalhe` com cor `aviso`.
- Faixa de aviso (ícone `triangle-alert`) quando há parcelas atrasadas: "1 parcela atrasada. Se já
  pagou, marque como paga na dívida." (ou "N parcelas atrasadas. ...").
- Botão principal "Nova dívida" e, embaixo, um cartão por dívida (`superficie`, canto 16, tocável,
  na ordem da API): credor em `valor`; motivo em `detalhe` (só se houver); "Falta R$ X de R$ Y" em
  `rotulo`; barra do bloco de meta (parcelas pagas ÷ total); "1 de 3 parcelas pagas" em `rotulo`; e
  a última linha em `detalhe`: "Próxima: R$ X em novembro de 2026", "Atrasada: R$ X de outubro de
  2026" (cor `aviso`) ou "Tudo pago".
- Sem dívidas: "Nenhuma dívida cadastrada." em `textoSecundario`, num cartão, abaixo do botão.

### Folha "Nova dívida" e folha da dívida
- Folha "Nova dívida": título, "Cada parcela conta como saída no mês dela até você marcar como
  paga." e cinco campos que rolam (máximo de 85% da altura): "Para quem", "Motivo (opcional)",
  "Valor total", "Parcelas" (começa em 1) e "Mês da primeira parcela (MM/AAAA)" (começa no mês
  atual do celular). Com valor e parcelas válidos, uma prévia em `detalhe` ("3x de R$ 333,33 (a
  última de R$ 333,34)"). Uma mensagem de erro só, embaixo dos campos, e a borda vermelha no
  campo com problema. Botões "Cancelar" e "Salvar".
- Folha da dívida: credor como título, motivo em `detalhe`, "R$ 1.000,00 em 3x · falta R$ 666,67"
  em `rotulo`, e uma lista de parcelas (altura mínima 56, divisória de 1 em `borda`). Cada linha é
  uma caixa de marcar: "Parcela 1 de 3" e o mês à esquerda; à direita o valor e a situação com
  ícone e texto: `circle-check` "Paga" (`acento`), `circle` "A pagar" (`textoSecundario`) ou
  `triangle-alert` "Atrasada" (`aviso`). Embaixo, "Fechar" (secundário) e "Apagar dívida"
  (principal); o primeiro toque em apagar troca o texto para "Toque de novo para apagar" e mostra
  "As 3 parcelas também serão apagadas." em `detalhe` com cor `erro`.

### Dívidas no Início
- Cartão "Saiu": com dívidas no mês, uma linha em `detalhe` "inclui R$ 333,33 de dívidas".
- Faixa de aviso depois da faixa da fatura: "Há R$ 333,33 em parcelas de dívidas atrasadas.".

### Lista de gastos
- Item: ícone de categoria (30x30, canto 15) à esquerda; descrição e detalhe no meio; valor à direita.
- Divisória de 1 em `borda` entre itens.
- Na aba Transações, o item inteiro é tocável e abre a folha "Categoria"; o ícone segue o nome
  em inglês da categoria e o texto mostra o nome em português.
- Quando a lista for agrupada por dia, o título do grupo ("Hoje", "Ontem", "08/10") usa `rotulo`.

### Botão
| Tipo | Fundo | Texto | Borda | Altura mínima |
|---|---|---|---|---|
| Principal | `acento` | `textoSobreAcento` | nenhuma | 48 |
| Secundário | transparente | `acento` | 1, `acento` | 48 |

### Folha de edição (ex.: editar o início do mês)
- Sobe de baixo da tela, `superficieElevada`, cantos de cima 20.
- Título, explicação curta, campo e botões "Salvar" (principal) e "Cancelar" (secundário).
- Folha "Plano de guardar": dois campos ("Quanto por mês" e "Até quando (MM/AAAA)"), cada um com
  o nome visível em `rotulo` em cima; uma mensagem de erro só, embaixo dos dois campos, e a borda
  vermelha no campo com problema.
- Folha "Categoria" (aba Transações, tocar numa transação): título "Categoria", a descrição da
  transação em `detalhe`, campo "Buscar categoria" (estilo do campo de texto, filtra sem
  diferenciar maiúsculas nem acentos) e uma lista que rola: primeiro a opção fixa "Transferência
  entre minhas contas" (com "Não conta como entrada nem saída." embaixo, em `detalhe`; manda
  "Same person transfer" e fica com o `check` quando a categoria original começa com "Same person
  transfer"), depois "Usar a categoria do banco"; a busca não esconde essas duas. Depois, uma
  linha por categoria (texto em `corpo`, altura mínima 48, divisória de 1 em `borda`).
  A categoria atual tem o ícone `check` (20, `acento`) à direita. Sem botão "Salvar": tocar numa
  linha já troca. Embaixo, só o botão secundário "Cancelar". A folha ocupa no máximo 85% da
  altura da tela. Sem resultado na busca: "Nenhuma categoria encontrada." em `textoSecundario`.

### Campo de texto / número
- Fundo `superficie`, borda 1 em `borda`, canto 12, altura mínima 48.
- Texto digitado em `corpo` com cor `texto`; dica (placeholder) em `textoTerciario`.
- Em foco: borda 2 em `acento`. Com erro: borda 2 em `erro` e mensagem embaixo em `detalhe` com cor `erro`.

### Abas
- Barra fixa embaixo, fundo `superficie`, divisória de 1 em `borda` no topo, altura 64 (mais a área segura do celular).
- Cada aba tem ícone de contorno (24) e texto curto em `rotulo` embaixo.
- Aba ativa em `acento`; abas inativas em `textoSecundario`.
- Abas, nesta ordem (desde 2026-10-17, Módulo 6):

| Aba | Ícone Lucide | Endereço |
|---|---|---|
| Início | `house` | `/` |
| Transações | `arrow-left-right` | `/transacoes` |
| Cartões | `credit-card` | `/cartoes` |
| Contas | `landmark` | `/contas` |
| Dívidas | `hand-coins` | `/dividas` |

- A quinta aba, Dívidas, entrou em 2026-10-18 (Módulo 12b).

- Na tela Transações, as setas de trocar de mês usam `chevron-left` e `chevron-right` (24, área de toque 44x44); a seta desativada fica em `textoTerciario`.

## 8. Estados da tela

| Estado | Aparência |
|---|---|
| Carregando | indicador na cor `acento` + texto em `textoSecundario` |
| Erro | texto em `texto`, botão secundário "Tentar de novo" |
| Vazio | ícone Lucide de 40 em `textoTerciario` e, embaixo, o texto em `textoSecundario`, centralizados no bloco |
| Atualizando (puxar para baixo) | indicador nativo na cor `acento` |
| Hora da atualização | linha em `detalhe` logo abaixo do título do mês: "Atualizado hoje às 14:32", "Atualizado ontem às 09:10", "Atualizado em 15/10 às 09:10" ou "Ainda não atualizado" |
| Falha ao atualizar | logo abaixo da hora, "Não foi possível atualizar agora." em `detalhe` com cor `aviso`; os valores de antes continuam na tela |

## 9. Ícones e imagens

| Campo | Valor |
|---|---|
| Conjunto de ícones | Lucide (`@react-native-vector-icons/lucide`, aprovado em 2026-10-10; o Expo deixou de recomendar o `@expo/vector-icons`) |
| Estilo | contorno (linha), traço fino |
| Ícones de categoria | ícone Lucide de 16 dentro do círculo colorido: `shopping-cart` (Mercado), `utensils` (Restaurantes), `car` (Transporte), `ellipsis` (Outras) |
| Ícones dos cartões | 16, cor `textoSecundario`, ao lado do rótulo: `wallet` (Saldo), `credit-card` (Fatura aberta), `arrow-down-left` (Entrou, cor `positivo`), `arrow-up-right` (Saiu, cor `negativo`), `piggy-bank` (Guardado), `scale` (Saldo do mês, no Relatório); aviso com `triangle-alert` (18, cor `aviso`) |
| Ícone de selecionado | `check` (20, cor `acento`), na categoria atual da folha "Categoria" |
| Ilustrações | nenhuma imagem; os estados vazios usam um ícone Lucide de 40 em `textoTerciario`, acima do texto, escondido do leitor de tela (componente `EstadoVazio`) |
| Ícones dos estados vazios | `receipt` (sem gastos, no Início e no Relatório), `credit-card` (sem cartão), `landmark` (sem conta), `hand-coins` (sem dívida), `arrow-left-right` (sem transação no mês) |

## 10. Movimento

O movimento ajuda a entender o que mudou; nunca enfeita à toa. Entrou no app em 2026-10-18
(Módulo 13). A parte com a `react-native-reanimated` (4.5.1, já instalada) chega nas entregas 2 e 3
do `docs/planos/modulo-13-embelezamento.md`; a tabela abaixo já vale como regra para elas.

### Princípios

| Princípio | Regra |
|---|---|
| Duração | de 150 a 500 ms; nada passa de 500 ms |
| Curva | `Easing.out(Easing.cubic)` ao entrar, `Easing.in(Easing.cubic)` ao sair; sem mola com quique |
| Toque | resposta instantânea, sem animação (ver a tabela de toque) |
| Reduzir movimento | sempre respeitado: `ReduceMotion.System` (padrão no Reanimated 4); a `Folha` usa `Modal` com `fade` (esmaecer não é movimento) |
| Acessibilidade | o conteúdo animado já está acessível desde o primeiro quadro (rótulos e valores reais, mesmo no meio da animação) |

### O que anima e o que não anima

| Onde | Movimento | Entrega |
|---|---|---|
| Toque em cartão tocável e no `Botao` | opacidade 0,85 e escala 0,98, troca imediata | 1 |
| Toque em botão de ícone (setas, Voltar) e em linha de lista | só opacidade 0,7, troca imediata | 1 |
| Folhas (as 5) | fundo com `fade`; a folha sobe com `SlideInDown` de 250 ms; fechar continua instantâneo | 2 (feita) |
| Barra de progresso | enche de 0 ao valor em 500 ms com `scaleX` (origem à esquerda), só ao aparecer | 2 (feita) |
| Entrada em cascata (Início e cartões de Cartões, Contas e Dívidas) | `FadeInDown` de 200 ms, subida de 8, atraso de 40 ms por bloco, no máximo 6 blocos, só na primeira carga | 3 (feita) |
| Troca de mês (Transações e Relatório) | `FadeIn` de 150 ms no conteúdo | 3 (feita) |
| Carregamento do Início | esqueleto com blocos `superficie` e pulso de opacidade de 0,5 a 1 em 900 ms (parado com "reduzir movimento"); a frase "Carregando o resumo..." continua visível | 3 (feita) |

Não animam: valores em dinheiro (o "posso gastar" aparece pronto), puxar para baixo, troca de aba,
itens de listas longas, régua de dias, erros e avisos.

### Folhas e barra (entrega 2)

- As 5 folhas usam o componente `Folha` (`mobile/src/componentes/Folha.tsx`): `Modal` com
  `animationType="fade"` (o fundo escurece no lugar) e a folha entra com
  `SlideInDown.duration(250).easing(Easing.out(Easing.cubic))`. Sem `.reduceMotion()`, vale o
  padrão `ReduceMotion.System` (conferido na fonte do Reanimated 4.5.1), então a entrada é pulada
  com "reduzir movimento". Folhas com lista ou campos que rolam passam `alturaMaxima="85%"`.
- `BarraDeProgresso` anima um `scaleX` de 0 até `porcentagem / 100` com `withTiming` (500 ms,
  `Easing.out(Easing.cubic)`), com `transformOrigin: 'left center'` (aceito pelo RN 0.86 e pelo
  Reanimated 4.5.1). Mudanças de valor partem do ponto atual. O `accessibilityValue` usa o número
  real desde o primeiro quadro.

### Cascata, troca de mês e esqueleto (entrega 3)

- `mobile/src/movimento.ts` guarda as entradas: `entradaEmCascata(indice)` (`FadeInDown` de
  200 ms, `Easing.out(Easing.cubic)`, subida de 8 com `withInitialValues`, atraso de
  `indice * 40` ms; do 7º bloco em diante devolve `undefined`, sem animação) e
  `ENTRADA_DO_CONTEUDO` (`FadeIn` de 150 ms).
- O `Animated.View` com `entering` fica por fora dos `Pressable`. No Início, os blocos são o
  destaque, a régua, Saldo/Fatura, Entrou/Saiu e Guardado; em Cartões, Contas e Dívidas, um por
  cartão (ou grupo). Transações (FlatList) e itens de listas longas não animam.
- Só na primeira carga: puxar para baixo não desmonta os blocos. No Início, depois de salvar numa
  folha, o resumo é relido sem passar por "carregando" (função `reler`), para a cascata não repetir.
- Troca de mês: o conteúdo de sucesso de `ListaDeTransacoes` e `RelatorioDoMes` entra com
  `ENTRADA_DO_CONTEUDO` (a `key={mes}` monta o componente de novo); setas e título ficam parados.
- `EsqueletoDoInicio`: blocos `superficie` no formato da tela, escondidos do leitor de tela, com
  pulso de opacidade (`withRepeat` + `withTiming`, 900 ms). Com "reduzir movimento" ligado, o
  `withTiming` vai direto ao valor final (`ReduceMotion.System`, padrão do Reanimated 4). A frase "Carregando o resumo..." continua visível embaixo.

### Toque (entrega 1)

O estilo vive num lugar só, em `mobile/src/tema.ts` (`toque.apertado` e `toque.apertadoIcone`).
Nenhuma tela escreve opacidade ou escala de toque por conta própria.

## 11. Acessibilidade

| Campo | Valor |
|---|---|
| Contraste mínimo do texto | 4,5:1 (texto pequeno); 3:1 (texto grande, 18+ ou 14+ em negrito) |
| Área mínima de toque | 44x44 |
| Fonte grande do sistema | respeitar (cartões quebram a linha se precisar) |
| Cor nunca é a única pista | valores com "+" e "-", avisos com texto |

## 12. Textos e formatos

| Campo | Valor |
|---|---|
| Dinheiro | `R$ 1.234,56`; negativo `- R$ 45,90` (com espaço) |
| Data curta | `08/10` |
| Mês | `Outubro de 2026` (no título do estilo B, em maiúsculas) |
| Tom | direto e calmo, frases curtas, sem exclamação |
| Rótulos | "Posso gastar por dia", "Saldo", "Fatura aberta", "Entrou", "Saiu", "Guardado" |
| Mês digitado | `07/2027` (campo "Até quando"); no texto da seção Guardado, `julho de 2027` |

## 13. O que evitar

- Gradientes, desfoque (blur), brilhos, texturas de fundo, sombras fortes, emojis como ícones.
- Verde ou vermelho muito vivos (cansam no fundo escuro); amarelo-limão como cor de acento.
- Mais de um número gigante por tela.
- Mais de um bloco com cor cheia na mesma tela.

## 14. Dúvidas em aberto

- Suas observações dos prints vieram em branco (as linhas "Print 1:", "Print 2:" e "Print 3:" estão vazias). Decidi só pelo que vi nas imagens; o "o que pegar" e o "o que não pegar" da seção 2 são minha leitura e precisam da sua conferência.
- Chegaram dois prints (cada um com três telas), mas havia três linhas de observação. Se existe um Print 3, ele não foi analisado.
- Todas as cores foram estimadas a olho a partir das imagens, não medidas com conta-gotas.
- A fonte dos prints parece uma sans geométrica (algo como Plus Jakarta Sans ou Urbanist), mas não consegui identificar com certeza. Mantive Manrope, que tem a mesma sensação e já estava no arquivo.
- ~~`acento` e `positivo` com o mesmo valor~~ Resolvido em 2026-10-10: `acento` virou roxo e `positivo` continua verde. Mudou em 2026-10-17: o verde saiu do app, para padronizar, e `positivo` usa o mesmo roxo do `acento`; entrada e saída se diferenciam pelo "+" e "-" e pelo vermelho das saídas.
- Ajuste por daltonismo (histórico, de quando `positivo` era verde): o verde do print 1 é mais escuro e saturado. Deixei `positivo` mais claro (`#45D699`) e `negativo` mais alaranjado e mais escuro (`#F2796F`), para que se diferenciem também pela luminosidade (razão de cerca de 1,5 entre eles), além do "+" e do "-" nos valores.
- Ajuste técnico (gradiente): o cartão de saldo do print 1 usa textura de ondas com brilho. Substituí por `superficie` lisa, sem textura.
- Ajuste técnico (blur): as folhas de vidro fosco do print 1 viraram `superficieElevada` sólida.
- Ajuste técnico (gráfico): o gráfico de área em degradê do print 2 não foi adotado. Se um gráfico entrar no app, definir se será linha simples ou barras sólidas.
- Contrastes conferidos (razão contra o fundo onde o texto aparece): `texto` acima de 13:1; `textoSecundario` 6,6:1 sobre `superficieElevada`; `textoTerciario` 5,0:1 sobre `superficieElevada` (o pior caso) e 5,5:1 sobre `superficie`; `acento` 9,2:1 sobre `superficie`; `textoSobreAcento` 10,2:1 sobre `acento`; `negativo` e `erro` 6,3:1 sobre `superficie`; `aviso` 9,7:1 sobre `avisoFundo`; letras de categoria entre 7:1 e 10:1 sobre o fundo do ícone. Mudei `textoTerciario` (era `#8794A1`) e `textoSecundario` (era `#9AA7B4`) para acompanhar os novos cinzas das superfícies.
- `diaFuturo` (`#2A3036`) tem pouco contraste contra o `fundo` (cerca de 1,4:1). Aceitei porque é um elemento decorativo e a informação também aparece em texto ("dia 10 de 31"). Se quiser mais presença, clarear para `#343B42`.
- `avisoBorda` é só contorno decorativo; o texto do aviso é que carrega a informação.
- Categorias: o print 1 mostra uma barra de gastos com verde, amarelo, laranja e azul, sem dizer qual cor é de qual categoria. Escolhi amarelo para Mercado, laranja para Restaurantes e azul para Transporte, deixando a cor das entradas fora das categorias. Trocar se preferir outra ligação.
- Ícone de categoria: os prints usam círculos (canto 15 em ícone de 30x30), então mudei do canto 10 anterior. Se preferir o quadrado arredondado do estilo C, voltar para 10.
- Abas: o print 1 mostra só ícones, sem texto. Coloquei ícone com texto curto por clareza (e leitores de tela). Se quiser só ícones, as abas precisam de `accessibilityLabel` de qualquer forma.
- ~~Falta decidir quais abas existirão e quais ícones representam cada uma.~~ Resolvido em 2026-10-17 (Módulo 6): Início, Transações, Cartões e Contas, com os ícones da seção 7, "Abas".
- Os prints mostram um campo de busca no topo da tela. O app não tem busca por enquanto, então não coloquei esse componente; o estilo do campo da seção 7 serve se ela entrar depois.
- Nome do app, conjunto de ícones e tema claro continuam `a definir`, como no arquivo original.
- Token que pode faltar no código: um tom para a barra de resumo de gastos com várias cores (print 1). Não criei token; hoje as cores de categoria já cobrem esse caso se a barra for usada.