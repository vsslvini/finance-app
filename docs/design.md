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

### Lista de gastos
- Item: ícone de categoria (30x30, canto 15) à esquerda; descrição e detalhe no meio; valor à direita.
- Divisória de 1 em `borda` entre itens.
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

### Campo de texto / número
- Fundo `superficie`, borda 1 em `borda`, canto 12, altura mínima 48.
- Texto digitado em `corpo` com cor `texto`; dica (placeholder) em `textoTerciario`.
- Em foco: borda 2 em `acento`. Com erro: borda 2 em `erro` e mensagem embaixo em `detalhe` com cor `erro`.

### Abas (quando existirem)
- Barra fixa embaixo, fundo `superficie`, divisória de 1 em `borda` no topo, altura 64 (mais a área segura do celular).
- Cada aba tem ícone de contorno (24) e texto curto em `rotulo` embaixo.
- Aba ativa em `acento`; abas inativas em `textoSecundario`.

## 8. Estados da tela

| Estado | Aparência |
|---|---|
| Carregando | indicador na cor `acento` + texto em `textoSecundario` |
| Erro | texto em `texto`, botão secundário "Tentar de novo" |
| Vazio | texto em `textoSecundario`, centralizado no bloco |
| Atualizando (puxar para baixo) | indicador nativo na cor `acento` |
| Hora da atualização | linha em `detalhe` logo abaixo do título do mês: "Atualizado hoje às 14:32", "Atualizado ontem às 09:10", "Atualizado em 15/10 às 09:10" ou "Ainda não atualizado" |
| Falha ao atualizar | logo abaixo da hora, "Não foi possível atualizar agora." em `detalhe` com cor `aviso`; os valores de antes continuam na tela |

## 9. Ícones e imagens

| Campo | Valor |
|---|---|
| Conjunto de ícones | Lucide (`@react-native-vector-icons/lucide`, aprovado em 2026-10-10; o Expo deixou de recomendar o `@expo/vector-icons`) |
| Estilo | contorno (linha), traço fino |
| Ícones de categoria | ícone Lucide de 16 dentro do círculo colorido: `shopping-cart` (Mercado), `utensils` (Restaurantes), `car` (Transporte), `ellipsis` (Outras) |
| Ícones dos cartões | 16, cor `textoSecundario`, ao lado do rótulo: `wallet` (Saldo), `credit-card` (Fatura aberta), `arrow-down-left` (Entrou, cor `positivo`), `arrow-up-right` (Saiu, cor `negativo`), `piggy-bank` (Guardado); aviso com `triangle-alert` (18, cor `aviso`) |
| Ilustrações | nenhuma |

## 10. Movimento

| Campo | Valor |
|---|---|
| Animações | mínimas: só a folha de edição subindo |
| Respeitar "reduzir movimento" do celular | sim |

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
- Falta decidir quais abas existirão e quais ícones representam cada uma.
- Os prints mostram um campo de busca no topo da tela. O app não tem busca por enquanto, então não coloquei esse componente; o estilo do campo da seção 7 serve se ela entrar depois.
- Nome do app, conjunto de ícones e tema claro continuam `a definir`, como no arquivo original.
- Token que pode faltar no código: um tom para a barra de resumo de gastos com várias cores (print 1). Não criei token; hoje as cores de categoria já cobrem esse caso se a barra for usada.