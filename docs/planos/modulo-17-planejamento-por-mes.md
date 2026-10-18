# Plano do Módulo 17: planejamento por mês na aba "A pagar"

Pedido do Vinicius em 2026-10-18, depois do Módulo 16: as linhas de total ficaram inconsistentes
(nos fixos só o "falta este mês", que dá zero quando os fixos começam no mês que vem; nas
dívidas o total que falta de uma vez, sem dizer de que mês). Ele quer, para se planejar: a soma
total, **em que mês** cada valor precisa ser pago e **quanto % da renda** isso tira. Decisões do
Claude no modo autônomo. 17a é o backend; 17b é o app.

## Decisões

1. **Cartão "Por mês"** no topo da aba "A pagar": o mês atual do app e os 5 seguintes (6 linhas).
   Cada linha: nome do mês, total do mês (fixos + parcelas de dívida), o detalhe "Fixos R$ X ·
   Dívidas R$ Y", a % da renda com uma barra, e "Falta R$ W" (o que ainda não foi pago).
2. **Fixos do mês** = soma dos fixos que já começaram naquele mês (`mes_inicio` até o mês), pagos
   ou não: é o custo do mês. **Dívidas do mês** = soma das parcelas daquele mês, pagas ou não.
3. **Falta** = no mês atual, os fixos a pagar (a mesma regra do gasto previsto) mais as parcelas
   não pagas do mês; nos meses seguintes, todos os fixos mais as parcelas não pagas do mês.
   Parcelas atrasadas não entram no cartão (já têm a faixa de aviso própria), para o "falta" nunca
   passar do total do mês.
4. **Renda**: novo campo `renda_mensal` nas configurações (vazio = sem renda), editado no próprio
   cartão. **% da renda** = total do mês ÷ renda × 100, com uma casa decimal; sem renda, o cartão
   mostra "Informe sua renda para ver quanto isso tira dela.". Por quê renda informada e não as
   entradas do mês: as entradas variam (transferências, reembolsos) e o mês atual ainda não
   recebeu tudo; um valor fixo é previsível e a pessoa troca quando quiser.
5. As faturas de cartão **não** entram no cartão "Por mês": a aba é dos gastos fixos e dívidas, e
   as faturas já têm a aba Cartões e o "Gasto previsto" do Início.
6. As linhas embaixo dos títulos (Módulo 16) mudam para não confundir:
   - Gastos fixos: "Total: R$ X por mês" (soma de **todos** os fixos cadastrados).
   - Dívidas: "Falta R$ Z no total (de R$ T)" (o que sobra de todas as dívidas, somadas).
7. A conta fica no backend (regra de negócio, decisão de 2026-10-08), numa rota nova
   `GET /api/a-pagar/`, para o app só desenhar.

Versão mais simples descartada: calcular os meses no app com as listas que ele já tem. Daria
certo para os valores, mas a regra do "falta" (pago automático pelo trecho) já mora no backend, e
a % precisa da renda guardada lá.

## 17a: backend (`python-backend-engineer`)

- `Configuracao.renda_mensal` (DecimalField, nulo permitido) com migration; o
  `ConfiguracaoSerializer` aceita e devolve o campo (não negativo, como o limite da fatura).
- `services/a_pagar.py`: `meses_a_pagar(hoje, dias_antes, quantos=6)`.
- Rota `GET /api/a-pagar/` (com token), resposta:

```json
{
  "renda_mensal": "5000.00",
  "meses": [
    {"mes": "2026-10", "fixos": "1600.40", "dividas": "333.33", "total": "1933.73",
     "falta": "300.00", "percentual_da_renda": "38.7"}
  ]
}
```

Casos de teste (pytest):

1. Sem nada cadastrado: 6 meses a partir do mês atual do app, tudo "0.00", percentual nulo sem
   renda.
2. Fixo que começa no mês que vem: fica fora do mês atual e entra nos seguintes.
3. Parcelas de uma dívida em 3x caem nos 3 meses certos; o mês sem parcela tem dívidas "0.00".
4. Total = fixos + dívidas.
5. Falta do mês atual: fixo pago (manual) e parcela paga saem do falta, mas continuam no total.
6. Falta dos meses seguintes: todos os fixos mais as parcelas não pagas.
7. Com renda 5000 e total 1933.73, percentual "38.7"; renda vazia, percentual nulo.
8. O mês atual segue os "dias antes do mês" (no dia 30/10 com 2 dias, o primeiro mês é novembro).
9. A virada do ano sai certa (novembro + 5 = abril do ano seguinte).
10. Configurações: PATCH com `renda_mensal` grava; negativo responde 400; `null` limpa.
11. Sem token responde 401.

## 17b: app (`react-native-expert` e `mobile-tester`)

- `api.ts`: tipos e `buscarAPagarPorMes()`; `Configuracoes.renda_mensal`.
- Componente `CartaoPorMes` (novo) no topo da aba, com as 6 linhas; a renda aparece em cima, e
  tocar nela abre a `FolhaDeEdicao` com o campo novo `rendaMensal`.
- A aba busca as três rotas juntas; depois de qualquer mudança (marcar pago, salvar, apagar,
  renda), relê tudo.
- As linhas dos títulos mudam como na decisão 6.

Casos de teste (Jest):

1. O cartão mostra os 6 meses com nome, total, "Fixos R$ X · Dívidas R$ Y" e "Falta R$ W".
2. Com renda, mostra "38,7% da renda" e a renda no topo; sem renda, mostra o convite para
   informar.
3. Tocar na renda abre a folha "Renda mensal"; salvar manda o PATCH e relê a aba.
4. A linha dos fixos mostra "Total: R$ X por mês" somando todos os fixos (inclusive os que ainda
   não começaram).
5. A linha das dívidas mostra "Falta R$ Z no total (de R$ T)".
6. Os testes do Módulo 16 que conferiam as frases antigas são trocados pelos casos 4 e 5.
