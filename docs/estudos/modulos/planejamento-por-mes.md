# Módulo 17: planejamento por mês na aba "A pagar"

Escrito em 2026-10-18. Pedido do Vinicius depois do Módulo 16: as linhas de total respondiam
"quanto falta agora", mas a aba serve para **planejar**: quanto custa cada mês, em que mês se
paga e quanto isso tira da renda. Plano em
[`../../planos/modulo-17-planejamento-por-mes.md`](../../planos/modulo-17-planejamento-por-mes.md).
**Antes, estude** [`totais-a-pagar.md`](totais-a-pagar.md) e
[`gasto-previsto-e-fixos.md`](gasto-previsto-e-fixos.md).

## 1. O que o módulo entrega

- **Cartão "Por mês"** no topo da aba: o mês atual do app e os 5 seguintes. Cada linha mostra o
  total do mês, "Fixos R$ X · Dívidas R$ Y", "Falta R$ W" e, com renda informada, "38,7% da
  renda" com uma barra.
- **Renda mensal**: nova configuração, editada tocando em "Renda: R$ ..." (ou no convite
  "Informe sua renda...") no topo do cartão. Abre a mesma `FolhaDeEdicao` do início do mês e do
  limite da fatura.
- As linhas dos títulos mudaram: "Total: R$ X por mês" (todos os fixos) e "Falta R$ Z no total
  (de R$ T)" (todas as dívidas).

## 2. O que é cada número

- **Fixos do mês**: soma dos fixos que já começaram naquele mês, pagos ou não. É o custo do mês.
- **Dívidas do mês**: soma das parcelas daquele mês, pagas ou não.
- **Total** = fixos + dívidas.
- **Falta**: no mês atual, os fixos ainda a pagar (pago à mão ou achado no extrato sai) mais as
  parcelas não pagas do mês. Nos meses seguintes, todos os fixos mais as parcelas não pagas.
  Parcelas atrasadas de meses passados não entram (já têm a faixa de aviso), para o "falta" nunca
  passar do total.
- **% da renda** = total ÷ renda × 100, com uma casa (`ROUND_HALF_UP`: 0,05 vira 0,1). Sem renda,
  ou renda zero, não há %: dividir por zero não faz sentido.

Por que a renda é informada e não as entradas do mês: as entradas variam (transferências entre
contas, reembolsos), e no começo do mês ainda não entrou tudo. Um valor que você informa é
previsível.

## 3. O fluxo

1. A aba (`src/app/(abas)/dividas.tsx`) busca três rotas juntas com `Promise.all`:
   `/api/gastos-fixos/`, `/api/dividas/` e a nova `/api/a-pagar/`.
2. No backend, a view `a_pagar` (`planejamento/views.py`) lê a `Configuracao` (renda e dias antes
   do mês) e chama `meses_a_pagar` (`planejamento/services/a_pagar.py`).
3. O service acha o mês atual do app (`mes_atual`, a mesma regra do resumo) e, para cada um dos 6
   meses, reaproveita funções que já existiam: `total_previsto` e `total_a_pagar` (fixos),
   `total_do_mes` (parcelas não pagas) e `somar_meses` (a virada do ano).
4. A view acrescenta a % de cada mês e passa tudo pelo `APagarSerializer`, que devolve o dinheiro
   como texto ("1600.40"); sem ele, o `Response` mandaria `float`.
5. O `CartaoPorMes` (`src/componentes/CartaoPorMes.tsx`) só desenha. Tocar na renda abre a
   `FolhaDeEdicao` com o campo `rendaMensal`, que faz `PATCH /api/configuracoes/`; ao salvar, a
   aba relê as três rotas.

## 4. Arquivos novos ou mudados

- Backend: `models.py` (`Configuracao.renda_mensal`), migration
  `0005_configuracao_renda_mensal.py`, `services/a_pagar.py`, `serializers.py` (renda nas
  configurações, `MesAPagarSerializer` e `APagarSerializer`), `views.py`, `urls.py`, `admin.py`.
- App: `api.ts` (tipos e `buscarAPagarPorMes`), `componentes/CartaoPorMes.tsx`,
  `componentes/FolhaDeEdicao.tsx` (campo `rendaMensal`), `app/(abas)/dividas.tsx`.

Acessibilidade: o botão da renda é lido pelo leitor de tela com o mesmo texto que aparece na tela
(e a dica "Toque para editar"). Quem vê e quem ouve encontram o botão pelo mesmo nome; foi isso
que um teste pegou quando o nome lido era diferente do texto visível.

## 5. Os testes

Backend, `planejamento/tests/test_a_pagar.py` (o service, sem HTTP):

1. Sem nada cadastrado: 6 meses a partir de outubro, tudo "0.00".
2. Fixo que começa em novembro fica fora de outubro e entra nos seguintes.
3. Dívida de 1000 em 3x cai em outubro, novembro e dezembro (333,33, 333,33, 333,34).
4. Total = fixos + dívidas.
5. No mês atual, fixo pago à mão e parcela paga saem do falta, mas ficam no total.
6. Em novembro, o falta tem todos os fixos mais as parcelas não pagas.
7. % da renda: 38,7 com renda 5000; `None` sem renda ou com renda zero; 0,05 arredonda para 0,1.
8. No dia 30/10 com 2 dias antes do mês, o primeiro mês já é novembro.
9. Novembro + 5 meses termina em abril de 2027.

Backend, `test_api_a_pagar.py` (a rota): sem token dá 401; o formato exato do JSON; a % e a renda
como texto; o mês atual pela rota. `test_api_configuracoes.py`: a renda é gravada, negativa dá
400, `null` limpa.

App, `__tests__/dividas-test.tsx`:

1. O cartão mostra os 6 meses com o detalhe, o total e o falta.
2. Com renda, "38,7% da renda" e o botão "Renda: R$ 5.000,00"; sem renda, o convite e nenhuma %.
3. Tocar na renda abre "Renda mensal" com o valor atual; salvar manda só `{ renda_mensal }` e a
   aba relê o planejamento.
4. "Total: R$ 1.379,90 por mês" soma todos os fixos, até o que ainda não começou.
5. "Falta R$ 1.166,67 no total (de R$ 1.500,00)" soma as dívidas.
6. Sem fixos e sem dívidas, as duas linhas não aparecem.

## 6. Para testar à mão

```fish
curl -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/a-pagar/
curl -X PATCH -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" \
  -d '{"renda_mensal": "5000.00"}' http://127.0.0.1:8000/api/configuracoes/
```

No celular: aba "A pagar", toque em "Informe sua renda...", salve, e veja a % em cada mês.
