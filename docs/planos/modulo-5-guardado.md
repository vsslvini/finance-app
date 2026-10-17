# Plano do Módulo 5: seção "Guardado"

Aprovado pelo Vinicius em 2026-10-10. Atende RF04, RF28 e RF29 (`docs/requisitos.md`). Vale
este arquivo como plano; o documento de estudo do módulo vai para `docs/estudos/modulos/`
quando o código estiver pronto.

## Antes de começar (pedido no fim da sessão de 2026-10-10)

- **Tirar o verde e usar roxo, para padronizar.** Decidido em 2026-10-17: `positivo` usa o
  mesmo roxo do `acento` (opção mais simples), em `docs/design.md` e `mobile/src/tema.ts`.
  Freio conversado: "Entrou" fica com a mesma cor dos botões e da régua; entrada e saída
  continuam diferentes pelo "+" e "-" e pelo vermelho das saídas.

## Decisões aprovadas

1. Contam como "guardado" **todos** os investimentos da Pluggy (escolher um a um fica para
   depois).
2. "Guardado este mês" = aplicações menos resgates na conta corrente, no mês do app,
   reconhecidos pelas categorias de investimento do Módulo 4c (não pela variação do saldo).
3. A barra de progresso usa o **previsto** como alvo (não há valor alvo fixo).

## Como funciona

- **Guardado hoje** = soma dos saldos dos investimentos (`GET /investments` da Pluggy).
- **Guardado este mês** = aplicações - resgates do mês do app.
- **Plano** = valor por mês + mês alvo (uma linha só; vazio = sem plano).
- **Previsto** = guardado hoje + valor por mês x meses que faltam até o mês alvo (contando o
  mês alvo); se o mês atual já foi guardado (guardado este mês >= valor por mês), o mês atual
  não entra na conta.
- **Progresso** = guardado hoje / previsto, em %, arredondado para baixo.
- **Desconto (RF29)**: falta guardar no mês = valor por mês - guardado este mês (mínimo 0);
  posso gastar = (saldo - falta guardar) / dias. Some sozinho quando o mês é guardado.

## 5a: backend (`python-backend-engineer`)

1. Cliente da Pluggy: `listar_investimentos(item_id)` com paginação (como as transações);
   registrar rota, campos e limites em `docs/pluggy.md` (regra 10). Campos conferidos em
   2026-10-10: `id`, `itemId`, `name`, `type`, `subtype`, `balance`, `status` (`ACTIVE`,
   `PENDING`, `TOTAL_WITHDRAWAL`), `institution` (pode vir `null`).
2. Model `Investimento` (app `financas`): conexão (`PROTECT`), id da Pluggy (único), nome,
   tipo, subtipo, instituição, saldo (`Decimal`), status. Migration junto.
3. `sincronizar()` busca os investimentos de cada conexão: cria, atualiza e apaga os que
   sumirem daquela conexão.
4. Model `PlanoDeGuardar` (app `planejamento`, uma linha, como a `Configuracao`): valor por mês
   e mês alvo, ambos podendo ficar vazios.
5. `GET` e `PATCH /api/plano/`: recusa valor negativo e mês alvo no passado, com mensagem em
   português; campos vazios removem o plano.
6. Resumo ganha o bloco `guardado` (total, guardado no mês, plano, previsto, progresso, falta
   guardar no mês) e o "posso gastar" desconta o que falta guardar.

## 5b: tela (`mobile-ui-expert` revisa; `react-native-expert` e `mobile-tester` fazem)

1. Seção "Guardado" antes de "Últimos gastos": ícone `piggy-bank`, total, "+ R$ 500,00 este
   mês", barra roxa e "R$ 1.300,00 de R$ 5.800,00 previstos em julho de 2027". Sem plano:
   "Toque para criar um plano de guardar".
2. Tocar na seção abre a folha "Plano de guardar": "Quanto por mês" (reais, usa `lerReais`) e
   "Até quando" (MM/AAAA). Vazios removem o plano.
3. Linha discreta sob o "posso gastar" quando houver desconto: "já separando R$ 200,00 para
   guardar".

## Casos de teste aprovados

5a (backend):

1. O cliente da Pluggy lista os investimentos de uma conexão e junta as páginas (Pluggy falsa,
   sem internet).
2. `sincronizar()` cria os investimentos, atualiza o saldo na segunda vez e apaga o que sumiu
   daquela conexão.
3. Guardado hoje = soma dos saldos dos investimentos ativos; resgatados (saldo zero) não
   atrapalham.
4. Guardado este mês = aplicações - resgates na corrente, só no mês do app.
5. Previsto: R$ 1.300 guardados, R$ 500/mês, de outubro de 2026 a julho de 2027: sem ter
   guardado no mês, 1.300 + 10 x 500 = R$ 6.300; tendo guardado, 1.300 + 9 x 500 = R$ 5.800.
6. Progresso = guardado hoje / previsto, para baixo, em %.
7. "Posso gastar" desconta o que falta guardar; com o mês guardado, não desconta; sem plano,
   igual a hoje.
8. `PATCH /api/plano/` salva valor e mês, aceita os dois vazios (remove o plano) e recusa
   valor negativo e mês no passado, com mensagem.
9. O resumo traz o bloco `guardado`, com `plano` `null` quando não há plano.

5b (tela):

10. A seção mostra o total, "+ R$ 500,00 este mês", a barra e "R$ 1.300,00 de R$ 5.800,00
    previstos em julho de 2027".
11. Sem plano, "Toque para criar um plano de guardar".
12. Tocar na seção abre "Plano de guardar"; salvar "500" e "07/2027" manda
    `{"valor_mensal": "500.00", "mes_alvo": "2027-07"}` e recarrega o resumo.
13. Mês em formato errado ("7/27") mostra "Digite o mês como MM/AAAA." sem chamar o servidor.
14. Com desconto, aparece "já separando R$ 200,00 para guardar".

Sem dependências novas.
