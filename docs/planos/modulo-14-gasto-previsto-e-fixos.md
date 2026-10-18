# Plano do Módulo 14: gasto previsto e gastos fixos

Pedido do Vinicius em 2026-10-18, depois de testar no celular: (1) "Gasto previsto", o quanto
ainda vai pagar no mês atual (o que não pagou) e no mês que vem, "talvez o mais importante de
todos"; (2) gastos fixos (apartamento, condução, internet) cadastrados uma vez, sem repetir todo
mês. Decisões do Claude no modo autônomo. 14a é o backend; 14b é o app.

## O que os dados reais mostram

- Os fixos são PIX para os mesmos destinatários todo mês: "DIRECIONAL ENGENHAR" e "CEU AZUL
  EMPREENDIM" (apartamento), "CAKTO PAY" (internet), "PEDRO FERREIRA DE A" (energia).
- Assinaturas (YouTube, Claude, Microsoft) vêm no cartão, ou seja, já entram na fatura.
- A data de vencimento dos cartões vem velha da Pluggy (5 e 7 de outubro, e hoje é 18 de
  outubro), enquanto o saldo do cartão já é a fatura aberta seguinte.

## Decisões

### Gastos fixos

1. **Gasto fixo** = nome ("Apartamento"), valor previsto por mês, dia do vencimento (opcional,
   1 a 31, só para mostrar), mês de início e um **trecho da descrição** opcional (ex.:
   "DIRECIONAL"). Fica ativo até ser apagado.
2. Cada mês, o fixo está **pago** ou **a pagar**:
   - **pago automático**: existe no mês do app uma saída (corrente ou cartão) cuja descrição
     contém o trecho (sem diferenciar maiúsculas);
   - **pago manual**: a pessoa marcou como pago naquele mês (para fixos sem trecho, ou pagos em
     dinheiro);
   - a pessoa pode desmarcar o manual; o automático não se desmarca (para não contar duas vezes,
     o pagamento real já está nas transações).
3. Mesma regra das dívidas para não contar duas vezes: fixo **a pagar** do mês conta nas
   **saídas** do mês e é descontado do "posso gastar"; **pago**, não conta (o pagamento real já
   está nas transações; no manual, a pessoa garante isso ao marcar).
4. O relatório mostra os fixos a pagar do mês como a categoria "Gastos fixos".
5. Fixo pago no cartão (com trecho de uma assinatura) fica pago pela compra no cartão, que já está
   na fatura: não conta duas vezes.

### Gasto previsto

6. **Falta pagar neste mês** (mês atual do app) = fixos a pagar do mês + parcelas de dívida não
   pagas do mês + parcelas atrasadas + faturas de cartão que **vencem neste mês** (ver 8).
7. **Previsto para o mês que vem** = fixos do mês que vem (todos ativos, pelo valor previsto) +
   parcelas de dívida do mês que vem + faturas que **vencem no mês que vem** (ver 8).
8. Em que mês uma fatura vence: se a `data_vencimento` do cartão é hoje ou depois, vale o mês do
   app dessa data; se está no passado ou vazia (o caso real de hoje), a fatura aberta vence no mês
   que vem. Valor = saldo do cartão (a fatura aberta). Limite conhecido: entre o fechamento e o
   vencimento, se a Pluggy não atualizar a data, a fatura vai para o mês errado.
9. O resumo traz o bloco `previsto` com os dois meses e o detalhe de cada um (fatura por cartão,
   fixos, dívidas, atrasadas), para o app mostrar de onde vem o número.

## 14a: backend (`python-backend-engineer`)

- App `planejamento`: models `GastoFixo` (nome, valor, dia_vencimento nulo, mes_inicio no dia 1,
  trecho_descricao vazio permitido, criado_em) e `PagamentoDeGastoFixo` (gasto com `CASCADE`, mes
  no dia 1, pago_em; único por gasto e mês: existir = pago manual). Migration. Admin.
- `planejamento/services/gastos_fixos.py`: situação de cada fixo num mês (pago automático, pago
  manual, a pagar) recebendo as descrições das saídas do mês (função pura para a regra do
  trecho) e os totais do mês.
- Rotas (com token):
  - `GET /api/gastos-fixos/`: lista (por nome) com `id`, `nome`, `valor`, `dia_vencimento`,
    `mes_inicio` ("AAAA-MM"), `trecho_descricao` e `este_mes` = `{mes, situacao: "pago_automatico"
    | "pago_manual" | "a_pagar" | "nao_comecou"}` (mês atual do app).
  - `POST /api/gastos-fixos/` (nome, valor, dia_vencimento, mes_inicio, trecho_descricao), 201.
    Mensagens: "Informe o nome do gasto.", "O valor precisa ser maior que zero.", "O dia do
    vencimento precisa ficar entre 1 e 31.", "Mês inválido. Use o formato AAAA-MM, ex.:
    2026-11.", "O trecho precisa ter pelo menos 3 letras." (trecho preenchido, sem contar os
    espaços das pontas, com menos de 3 caracteres; vazio continua permitido e o trecho é
    guardado sem os espaços das pontas).
  - `PATCH /api/gastos-fixos/<id>/` (os mesmos campos, parcial) e `DELETE` (204).
  - `PUT /api/gastos-fixos/<id>/pagamentos/<AAAA-MM>/` marca pago manual (cria; idempotente) e
    `DELETE` no mesmo endereço desmarca; os dois respondem o gasto fixo atualizado (com
    `este_mes`). Mês em formato errado: 400 com a mensagem de mês.
- Resumo: campo `fixos_do_mes` (fixos a pagar do mês do resumo, dentro de `saidas`), desconto no
  "posso gastar" (junto com dívidas), e o bloco `previsto`:

```json
"previsto": {
  "mes_atual": {
    "mes": "2026-10",
    "total": "693.58",
    "faturas": [],
    "fixos": "693.58",
    "dividas": "0.00",
    "atrasadas": "0.00"
  },
  "proximo_mes": {
    "mes": "2026-11",
    "total": "1680.29",
    "faturas": [{"conta": 3, "nome_banco": "Nubank", "nome_conta": "gold", "valor": "358.32"}],
    "fixos": "731.48",
    "dividas": "300.00"
  }
}
```

  `previsto` vem sempre calculado a partir do mês atual do app (mesmo com `?mes=` de outro mês).
- Relatório: categoria "Gastos fixos" com os fixos a pagar do mês (como "Dívidas"); saídas iguais
  às do resumo.

Casos de teste (14a):

1. Situação de um fixo num mês: pago automático pelo trecho (sem diferenciar maiúsculas, em
   saída da corrente ou do cartão), pago manual, a pagar, não começou (mês antes do início); o
   trecho não casa com entrada nem com transação de outro mês.
2. `POST` cria e recusa sem nome, valor zero, dia 0 ou 32, mês errado e trecho com menos de 3 letras, com as mensagens.
3. `GET` traz os campos e `este_mes` certo.
4. `PUT` e `DELETE` do pagamento marcam e desmarcam (idempotente), respondem o fixo; mês errado
   dá 400; `PATCH` e `DELETE` do fixo.
5. Resumo: fixo a pagar entra em `saidas` e em `fixos_do_mes` e desconta do "posso gastar";
   pago (automático ou manual) não conta; fixo que ainda não começou não conta.
6. Previsto do mês atual: fixos a pagar + dívidas do mês + atrasadas + fatura que vence neste mês.
7. Previsto do mês que vem: todos os fixos ativos + dívidas do mês que vem + fatura aberta com
   vencimento no passado ou vazio; com vencimento futuro neste mês, a fatura vai para o mês atual.
8. Relatório com a categoria "Gastos fixos".
9. Tudo exige token (401).

## 14b: contrato do app (proposta do `mobile-ui-expert`, decidida em 2026-10-18)

Decisões: o Início relê o resumo (sem "carregando") sempre que a aba ganha foco
(`useFocusEffect` do expo-router), para o previsto refletir o que foi marcado em "A pagar"; fatura
no detalhe com o nome do banco; o cartão do previsto só para leitura; aba "A pagar" com ícone
`hand-coins`, arquivo e endereço `/dividas` mantidos (comentário no topo do arquivo); trecho com
pelo menos 3 letras (app e backend); "Nova dívida" vira botão secundário; "Começa em" preenchido
com o mês do celular.

### Início

- Cartão "Gasto previsto" logo depois da régua (antes de Saldo/Fatura), `superficie`, canto 16,
  com o rótulo "Gasto previsto" (header, ícone `calendar-clock` escondido). Dois blocos
  empilhados, separados por divisória, cada um `accessible`:
  - "Falta pagar em outubro" (`rotulo`), valor (`valor`, cor `texto`, sem sinal) e, embaixo,
    linhas `detalhe` só para valores diferentes de "0.00", nesta ordem: "Fatura Nubank: R$ ..."
    (uma por fatura), "Gastos fixos: R$ ...", "Dívidas: R$ ...", "Parcelas atrasadas: R$ ..." (só
    no mês atual, cor `aviso`). Zerado: "R$ 0,00" e "Nada pendente.".
  - "Previsto para novembro", igual, sem atrasadas; zerado: "Nada previsto.".
  - Nome do mês em minúsculas e sem ano, vindo de `previsto.mes_atual.mes` e
    `previsto.proximo_mes.mes`.
  - Rótulos: "Falta pagar em outubro: 693,58 reais. Gastos fixos: 693,58 reais." e "Previsto para
    novembro: 1.680,29 reais. Fatura Nubank: 358,32 reais. Gastos fixos: 731,48 reais. Dívidas:
    300,00 reais."; zerado: "Falta pagar em outubro: 0,00 reais. Nada pendente.".
  - Sem `previsto` no resumo, o cartão não aparece.
  - Cascata: destaque 0, régua 1, previsto 2, Saldo/Fatura 3, Entrou/Saiu 4, Guardado 5.
- Cartão "Saiu": com `fixos_do_mes` diferente de "0.00", linha "inclui R$ 693,58 de gastos
  fixos" (depois da de dívidas) e o rótulo ganha ", inclui 693,58 reais de gastos fixos".

### Aba "A pagar" (`dividas.tsx`, `/dividas`)

- Título da aba e da tela "A pagar". Busca única com `Promise.all` de `buscarGastosFixos` e
  `buscarDividas` no `useCarga`; erro de qualquer uma, tela de erro com "Tentar de novo".
  Carregando: "Carregando o que falta pagar...".
- Ordem: título; aviso de falha ao atualizar; faixa de parcelas atrasadas; seção "Gastos fixos"
  (header, botão secundário "Novo gasto fixo", um cartão com uma linha por fixo); seção "Dívidas"
  (header, botão secundário "Nova dívida", cartões como hoje).
- Linha do fixo, dois alvos lado a lado:
  - à esquerda (`Pressable`, abre a folha do fixo): nome (`corpo`), "R$ 1.200,00 · vence dia 10"
    (sem dia: "R$ 1.200,00") e a situação com ícone e texto: `a_pagar` "A pagar" (`circle`),
    `pago_manual` "Pago" (`circle-check`, `acento`), `pago_automatico` "Pago (achado nas
    transações)" (`circle-check`, `acento`), `nao_comecou` "Começa em novembro de 2026"
    (`calendar`). Rótulo: "Apartamento, 1.200,00 reais por mês, vence dia 10. A pagar em
    outubro." (variações "Pago em outubro.", "Pago em outubro, achado nas transações.", "Começa em
    novembro de 2026."); hint "Toque para editar ou apagar".
  - à direita, botão secundário: "Marcar pago" (`a_pagar`, PUT do pagamento do `este_mes.mes`) ou
    "Desmarcar" (`pago_manual`, DELETE); sem botão em `pago_automatico` e `nao_comecou`. Rótulos
    "Marcar Apartamento como pago em outubro" e "Desmarcar o pagamento de Apartamento em outubro".
    Desativado durante o pedido; deu certo, relê com `atualizar()`; erro, mensagem embaixo do
    cartão (`erro`, `accessibilityLiveRegion="polite"`).
- Vazio dos fixos: `EstadoVazio` com `repeat` e "Nenhum gasto fixo cadastrado.".
- Cascata: cartão dos fixos 0, dívidas a partir de 1.

### Folha do gasto fixo (nova e editar; `Folha` com `alturaMaxima="85%"`)

- Título "Novo gasto fixo" (editar: o nome do gasto). Explicação: "Conta como saída todo mês até
  ser pago. Vale até você apagar.".
- Campos: "Nome"; "Valor por mês" (`decimal-pad`); "Dia do vencimento (opcional)" (`number-pad`);
  "Começa em (MM/AAAA)" (mês do celular); "Trecho para achar o pagamento (opcional)" com a dica
  "Parte do nome que aparece no extrato quando você paga, ex.: DIRECIONAL. Com ele, o app marca
  como pago sozinho.".
- Validações no app, nessa ordem: "Informe o nome do gasto."; "Digite um valor, ex.: 1.200,00.";
  "O valor precisa ser maior que zero."; "O dia do vencimento precisa ficar entre 1 e 31.";
  "Digite o mês como MM/AAAA."; "O trecho precisa ter pelo menos 3 letras.".
- Corpo: `{nome, valor, dia_vencimento (número ou null), mes_inicio, trecho_descricao}`; POST na
  nova, PATCH `/api/gastos-fixos/<id>/` no editar; erro da API mantém a folha com a mensagem.
- Só no editar: "Apagar gasto fixo" com dois toques ("Toque de novo para apagar" e "O gasto fixo e
  as marcações de pago serão apagados."); tocar num campo cancela; o segundo toque faz o DELETE,
  fecha e relê.

### Casos de teste (14b)

1. Início mostra "Gasto previsto", "Falta pagar em outubro" com "R$ 693,58" e "Previsto para
   novembro" com "R$ 1.680,29".
2. Detalhe só com o que não é zero.
3. "Parcelas atrasadas: R$ 120,00" no mês atual.
4. Zerados: "Nada pendente." e "Nada previsto.".
5. Rótulos dos dois blocos.
6. "inclui R$ 693,58 de gastos fixos" no Saiu (e ausente com "0.00"); sem `previsto`, o cartão
   não aparece.
7. Aba e tela "A pagar", cabeçalhos "Gastos fixos" e "Dívidas", botões "Novo gasto fixo" e "Nova
   dívida".
8. Fixo a pagar: textos e "Marcar pago", que faz o PUT em `/api/gastos-fixos/1/pagamentos/2026-10/`
   e relê.
9. Fixo pago manual: "Desmarcar" faz o DELETE no mesmo endereço e relê.
10. Pago automático sem botão; não começou sem botão; sem dia, só o valor.
11. Vazio dos fixos com as dívidas normais; erro dos fixos com "Tentar de novo".
12. PUT com erro: mensagem e a linha como estava.
13. Validações da folha nova (sem chamar a API) e o POST com o corpo exato (e `dia_vencimento:
    null` sem dia).
14. Folha de editar preenchida, PATCH ao salvar, apagar com dois toques.
15. O Início relê o resumo quando a aba ganha foco (segundo GET do resumo ao voltar para o Início,
    sem "Carregando o resumo...").
