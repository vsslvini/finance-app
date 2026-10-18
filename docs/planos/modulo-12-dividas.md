# Plano do Módulo 12: dívidas (RF21)

Pedido do Vinicius em 2026-10-17: uma aba de dívidas para cadastrar valor, para quem, o motivo,
as parcelas e o mês de pagamento; a dívida vira parcelas já calculadas, e cada parcela conta como
saída no mês dela (ex.: "mês que vem pago X para a minha tia"). Decisões do Claude no modo
autônomo. 12a é o backend; 12b é o app.

## Decisões

1. **Dívida** = para quem, motivo (opcional), valor total, número de parcelas (1 a 120) e o mês
   da primeira parcela. Ao cadastrar, o backend gera as **parcelas**: valor total ÷ parcelas,
   arredondado para baixo no centavo, e a última parcela leva a sobra (R$ 1.000 em 3x =
   333,33 + 333,33 + 333,34), uma por mês a partir do mês escolhido.
2. **Não contar duas vezes.** Quando a pessoa paga de verdade (um PIX), o dinheiro aparece nas
   transações. Por isso cada parcela tem "paga" (sim ou não), marcada no app:
   - parcela **não paga** do mês: conta nas **saídas** do mês e é descontada do "posso gastar";
   - parcela **paga**: deixa de contar (o PIX real já está nas saídas).
3. **Atrasadas**: parcelas não pagas de meses anteriores ao mês atual do app. Não entram nas
   saídas do mês atual (já eram do mês delas), mas são descontadas do "posso gastar" (o dinheiro
   está comprometido) e aparecem como aviso.
4. Editar: só "para quem" e "motivo". Para mudar valor, parcelas ou mês, apaga e cadastra de novo
   (mais simples do que recalcular parcelas já pagas). Apagar leva as parcelas junto.
5. O relatório do mês mostra as parcelas não pagas do mês como uma categoria "Dívidas" nos gastos
   (e as saídas continuam iguais às do resumo).
6. Aba nova "Dívidas" (quinta aba, ícone `hand-coins`).

## 12a: backend (`python-backend-engineer`)

- App `planejamento`: models `Divida` (credor, motivo, valor_total, total_parcelas (no model não
  pode ser `parcelas`, que é o nome da ligação com as parcelas), mes_inicio como
  data no dia 1, criada_em) e `ParcelaDaDivida` (divida com `CASCADE`, numero, mes, valor, paga,
  paga_em). Migration. Admin.
- `planejamento/services/dividas.py`: gerar parcelas (função pura), totais do mês (não pagas do
  mês, atrasadas).
- Rotas (com token):
  - `GET /api/dividas/`: lista (mais recente primeiro) com `id`, `credor`, `motivo`,
    `valor_total`, `total_parcelas`, `parcelas_pagas`, `valor_pago`, `valor_restante`,
    `proxima_parcela` (`{id, numero, mes: "AAAA-MM", valor, atrasada}` da primeira não paga, ou
    `null`) e `parcelas` (lista `{id, numero, mes, valor, paga, atrasada}`). `atrasada` (acréscimo
    de 2026-10-18) = não paga e com mês anterior ao mês atual do app (mesmo critério do
    `dividas_atrasadas` do resumo, com os dias antes da Configuracao); vale também na resposta
    do `POST`, do `PATCH` da dívida e do `PATCH` da parcela.
  - `POST /api/dividas/` com `{credor, motivo, valor_total, parcelas, mes_inicio: "AAAA-MM"}`:
    cria e gera as parcelas; responde a dívida (201). Mensagens: "Informe para quem é a
    dívida.", "O valor precisa ser maior que zero.", "As parcelas precisam ficar entre 1 e
    120.", "Mês inválido. Use o formato AAAA-MM, ex.: 2026-11.".
  - `PATCH /api/dividas/<id>/` (credor, motivo) e `DELETE /api/dividas/<id>/` (204).
  - `PATCH /api/parcelas/<id>/` com `{paga: true|false}`: marca (e grava `paga_em` com hoje ou
    limpa); responde a dívida inteira atualizada.
- Resumo: campos novos `dividas_do_mes` (soma das não pagas do mês do resumo) e
  `dividas_atrasadas` (soma das não pagas de meses anteriores ao mês atual do app; "0.00" quando
  o resumo não é do mês atual). `saidas` passa a incluir `dividas_do_mes`. "Posso gastar" =
  (saldo − falta guardar − dividas_do_mes − dividas_atrasadas) ÷ dias.
- Relatório: `saidas` igual ao resumo; nos gastos, as não pagas do mês viram a categoria
  `{"categoria": "Dívidas", "categoria_original": "", ...}` (entra no total, na ordem e na
  porcentagem); não entram nos "maiores gastos" (não são transações).

Casos de teste (12a):

1. Gerar parcelas: 1.000 em 3x a partir de 2026-11 dá 333,33 (nov), 333,33 (dez) e 333,34
   (jan/2027); 500 em 1x dá uma parcela; 100 em 3x dá 33,33 + 33,33 + 33,34.
2. `POST` cria a dívida e as parcelas; recusa sem credor, valor zero ou negativo, parcelas 0 ou
   121 e mês em formato errado, com as mensagens.
3. `GET` traz os campos, `proxima_parcela` certa (e `null` quando tudo está pago), valores pago
   e restante; `atrasada` é `true` na parcela não paga de mês passado, `false` na paga e na do
   mês atual (seguindo os dias antes da Configuracao).
4. `PATCH /api/parcelas/<id>/` marca e desmarca, grava e limpa `paga_em`, responde a dívida.
5. `PATCH` da dívida muda credor e motivo; `DELETE` apaga a dívida e as parcelas (204).
6. Resumo: parcela não paga do mês entra em `saidas` e em `dividas_do_mes`, e desconta do "posso
   gastar"; paga, não conta; de outro mês, não conta.
7. Resumo: parcela não paga de mês anterior entra em `dividas_atrasadas` e desconta do "posso
   gastar", mas não entra nas saídas do mês atual.
8. Relatório: categoria "Dívidas" com as não pagas do mês, saídas iguais às do resumo.
9. Tudo exige token (401).

## 12b: contrato do app (proposta do `mobile-ui-expert`, decidida em 2026-10-18)

Decisões: o backend manda `atrasada` em cada parcela e na `proxima_parcela`; o mês da primeira
parcela começa com o mês atual do celular; editar "para quem" e "motivo" fica para depois (apagar
e cadastrar de novo); as dívidas seguem a ordem da API.

### Aba "Dívidas" (`src/app/(abas)/dividas.tsx`, quinta aba, ícone `hand-coins`, `/dividas`)

- `ScrollView` com puxar para baixo pelo `useCarga` (testID `rolagem-dividas`), relendo só
  `/api/dividas/`. Ordem: título "Dívidas" (`titulo`, header); aviso "Não foi possível atualizar
  agora." se o puxar falhar; faixa de aviso (estilo do aviso da fatura, ícone `triangle-alert`
  escondido) quando houver parcelas com `atrasada: true`: "1 parcela atrasada. Se já pagou,
  marque como paga na dívida." ou "2 parcelas atrasadas. Se já pagou, marque como paga na
  dívida."; botão principal "Nova dívida"; um cartão por dívida.
- Cartão (`Pressable`, `accessibilityRole="button"`, hint "Toque para ver as parcelas"): credor
  (`valor`), motivo (`detalhe`, só se houver), "Falta R$ 666,67 de R$ 1.000,00" (`rotulo`),
  `BarraDeProgresso` com `parcelas_pagas` ÷ `total_parcelas` × 100 para baixo, "1 de 3
  parcelas pagas" (`rotulo`) e a última linha (`detalhe`): "Próxima: R$ 333,33 em novembro de
  2026"; atrasada: "Atrasada: R$ 333,33 de outubro de 2026" (cor `aviso`); sem próxima: "Tudo
  pago". Rótulo: "Dívida com Tia Maria, Empréstimo do carro. Falta 666,67 reais de 1.000,00
  reais. 1 de 3 parcelas pagas. Próxima parcela: 333,33 reais em novembro de 2026." (sem motivo,
  o trecho some; atrasada: "Parcela atrasada: 333,33 reais de outubro de 2026."; tudo pago:
  "Tudo pago.").
- Estados: "Carregando as dívidas...", erro de sempre com "Tentar de novo", vazio "Nenhuma dívida
  cadastrada." (num cartão, com o botão "Nova dívida" acima).
- Fechar qualquer folha depois de uma mudança relê a lista.

### Folha "Nova dívida" (modelo da `FolhaDoPlano`, `maxHeight: '85%'`, campos rolando)

- Título "Nova dívida" (header) e "Cada parcela conta como saída no mês dela até você marcar
  como paga.".
- Campos (rótulo acessível = nome visível): "Para quem" (default), "Motivo (opcional)" (default),
  "Valor total" (`decimal-pad`, `lerReais`), "Parcelas" (`number-pad`, começa "1"),
  "Mês da primeira parcela (MM/AAAA)" (`numbers-and-punctuation`, começa com o mês atual do
  celular, `lerMes`).
- Validações no app, nessa ordem, só a primeira aparece e a API não é chamada: "Informe para quem
  é a dívida."; "Digite um valor, ex.: 500,00."; "O valor precisa ser maior que zero.";
  "As parcelas precisam ficar entre 1 e 120."; "Digite o mês como MM/AAAA." (vazio também).
- Prévia (`detalhe`, só com valor e parcelas válidos, em centavos inteiros): "1x de R$ 500,00",
  "3x de R$ 300,00", "3x de R$ 333,33 (a última de R$ 333,34)".
- Salvar: `POST /api/dividas/` com `{credor, motivo, valor_total, parcelas, mes_inicio}`; deu
  certo, fecha e relê; 400, a folha fica com a mensagem do servidor.

### Folha da dívida (ao tocar no cartão; usa a dívida que a aba já tem)

- Título = credor (header), motivo (`detalhe`), "R$ 1.000,00 em 3x · falta R$ 666,67" (`rotulo`).
- `FlatList` de parcelas; cada linha é `Pressable` com `accessibilityRole="checkbox"`,
  `accessibilityState={{ checked: paga, disabled: salvando }}`, rótulo "Parcela 1 de 3, outubro de
  2026, 333,33 reais" (+ ", atrasada"), hint "Toque para marcar como paga" / "Toque para
  desmarcar". Visual: "Parcela 1 de 3" e o mês; à direita o valor e a situação com ícone e texto:
  `circle-check` "Paga" (`acento`), `circle` "A pagar", `triangle-alert` "Atrasada" (`aviso`).
- Tocar: `PATCH /api/parcelas/<id>/` com `{paga: !paga}`; a folha troca a dívida pela resposta;
  erro mostra a mensagem e a linha fica como estava; todas as linhas desativadas durante o pedido.
- Botões: "Fechar" e "Apagar dívida". Apagar: primeiro toque troca o texto para "Toque de novo
  para apagar" e mostra "As 3 parcelas também serão apagadas." (ou "A parcela também será
  apagada."); segundo toque faz `DELETE /api/dividas/<id>/`, fecha e relê; tocar numa parcela
  cancela a confirmação.

### Início

- Cartão "Saiu": com `dividas_do_mes` diferente de "0.00", linha `detalhe` "inclui R$ 333,33 de
  dívidas" e rótulo "Saiu no mês: 1.200,00 reais, inclui 333,33 reais de dívidas".
- Com `dividas_atrasadas` diferente de "0.00", faixa de aviso (depois da da fatura): "Há
  R$ 333,33 em parcelas de dívidas atrasadas.".

### Casos de teste (12b)

1. Aba vazia: "Nenhuma dívida cadastrada." e "Nova dívida".
2. Cartão completo com os textos e o rótulo exato.
3. Quitada ("Tudo pago", sem "Próxima:") e sem motivo (sem a linha).
4. Faixa de atrasadas no singular e no plural, ausente sem atrasadas; cartão com "Atrasada: ...".
5. Carregando e erro com "Tentar de novo".
6. Validações da folha "Nova dívida" (sem chamar a API).
7. Valores iniciais ("1" e o mês atual) e as três prévias; valor inválido sem prévia.
8. Salvar manda o corpo exato, fecha e relê; 400 mantém a folha com a mensagem.
9. Lista de parcelas com "Atrasada", "Paga" e "A pagar", `checked` e o rótulo exato.
10. Marcar (`{paga: true}`) e desmarcar (`{paga: false}`); erro mantém a linha e mostra a
    mensagem; fechar depois de marcar relê.
11. Apagar com dois toques (o primeiro não chama a API).
12. Início: linha "inclui ... de dívidas" com o rótulo, faixa de atrasadas, e nada com "0.00".
13. Abas: a quinta aba "Dívidas" leva a `/dividas`.
