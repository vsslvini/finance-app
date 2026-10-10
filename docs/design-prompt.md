# Prompt para preencher o guia de design

Use no Claude da web (claude.ai) para transformar prints de referência no `docs/design.md`.

## Como usar

1. Abra uma conversa nova no claude.ai.
2. Anexe os prints de referência (telas de apps que você gosta; até uns 10).
3. Anexe também o arquivo `docs/design.md` atual.
4. Copie e cole o prompt abaixo. Antes de enviar, escreva embaixo de "Minhas observações"
   o que você gosta e o que não gosta em cada print (ex.: "print 2: gosto dos cartões, não
   gosto do roxo").
5. Confira a resposta: ela deve ser só o arquivo `design.md` completo. Substitua o arquivo
   do projeto por ela e peça ao Claude Code para revisar antes do commit.

## Prompt

```text
Você é um designer de produto especialista em apps mobile de finanças pessoais.

CONTEXTO
Estou fazendo um app pessoal de finanças em React Native com Expo (SDK 57). A tela
principal ("Início") mostra, nesta ordem: quanto posso gastar por dia (o número mais
importante), saldo e fatura aberta do cartão, entradas e saídas do mês, um plano de
guardar dinheiro com barra de progresso e os últimos gastos. O ponto de partida é um
estilo escuro e calmo (inspirado no Copilot Money), com ícones coloridos por categoria
nos gastos. O app é só para mim, em português do Brasil.

ANEXOS
1. Prints de referência de apps que eu gosto.
2. O arquivo design.md, que é o modelo a preencher. Ele já vem com valores iniciais.

TAREFA
Analise os prints e minhas observações e devolva o design.md preenchido.

REGRAS DE CONTEÚDO
- Mantenha exatamente a mesma estrutura do arquivo: os mesmos títulos, as mesmas tabelas,
  os mesmos nomes de campos e de tokens (ex.: `fundo`, `superficie`, `acento`). O código do
  app vai usar esses nomes. Não crie nem renomeie tokens; se faltar um, cite na seção 14.
- Troque os valores pelo que os prints sugerem. Quando um print não disser nada sobre um
  campo, mantenha o valor atual.
- Na seção 2 (Referências), crie uma linha por print ("Print 1", "Print 2"...) com o que
  pegar e o que não pegar, usando minhas observações.
- Cores sempre em hexadecimal #RRGGBB. Estime pelo print; não invente nomes de cores.
- Confira o contraste: texto comum precisa de pelo menos 4,5:1 contra o fundo onde aparece;
  texto grande, de 3:1. Se uma cor do print não passar, ajuste a cor e diga isso na seção 14.
- Verde e vermelho de entradas e saídas devem ser distinguíveis também para quem tem
  daltonismo comum; os valores sempre têm "+" e "-", então a cor não é a única pista.
- Preencha as cores de cada categoria da tabela de categorias.

REGRAS TÉCNICAS (React Native)
- Medidas em pontos (números sem unidade), não em rem, em ou porcentagem de fonte.
- Fontes: só do Google Fonts ou a fonte do sistema. Diga o nome exato da família.
- Nada de gradientes, desfoque de fundo (blur) ou sombras complexas: o app não usa as
  bibliotecas que isso exige. Se um print depender disso, sugira uma alternativa sólida.
- Ícones: diga o estilo (contorno ou preenchido); o conjunto será escolhido depois.

FORMATO DA RESPOSTA
- Responda somente com o conteúdo completo do design.md, em Markdown, pronto para salvar.
- Sem texto antes ou depois do arquivo.
- Português do Brasil. Não use travessão (o caractere de traço longo); use vírgula, ponto e
  vírgula ou parênteses.
- Na linha "Estado" do topo, escreva: "preenchido a partir de prints em <data de hoje>".
- Na seção 14 (Dúvidas em aberto), liste tudo o que você não conseguiu decidir pelos
  prints e cada ajuste que fez por contraste ou por limite técnico.

Minhas observações:
- Print 1:
- Print 2:
- Print 3:
```
