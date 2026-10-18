# Plano do Módulo 18: cartão "Por mês" resumido

Pedido do Vinicius em 2026-10-18: o cartão "Por mês" do Módulo 17 ficou carregado (6 linhas de
uma vez). Quer um cartão resumido com a renda (ou o convite para informar) e a % que cada tipo
de conta (gastos fixos e dívidas) tira da renda; ao tocar, uma animação e uma folha com tudo.
Decisões do Claude no modo autônomo. 18a é o backend; 18b é o app.

## Decisões

1. **Mês em foco** do cartão resumido: o primeiro dos 6 meses com algo a pagar (`falta` maior
   que zero); se nenhum tiver, o mês atual. Por quê: a pergunta do planejamento é "quanto vou
   pagar na próxima vez", e os fixos do Vinicius começam no mês que vem (o mês atual mostraria
   zero). O app escolhe o mês (é só escolher qual linha mostrar), sem regra nova no backend.
2. **Cartão resumido** (tocável inteiro):
   - título "Por mês" e, à direita, o ícone `chevron-right` (sinal de que abre algo);
   - "Renda: R$ 5.000,00" ou, sem renda, "Informe sua renda para ver quanto isso tira dela.";
   - o nome do mês em foco e o total dele ("Novembro de 2026", "R$ 1.933,73");
   - duas linhas, "Gastos fixos" e "Dívidas", cada uma com o valor e, com renda, "24,0% da
     renda" e uma barra.
3. **Toque**: o cartão responde ao toque como os outros cartões tocáveis (opacidade 0,85 e escala
   0,98, seção 10 do `docs/design.md`) e abre a folha **"Por mês"**, que sobe com a animação de
   entrada das folhas. A folha tem a renda com o botão "Editar renda" (ou "Informar renda") e as
   6 linhas do Módulo 17. "Editar renda" fecha esta folha e abre a da renda (duas folhas abertas
   juntas dão problema, como na dívida).
4. A % de cada tipo vem do backend: cada mês da `GET /api/a-pagar/` ganha `percentual_fixos` e
   `percentual_dividas` (mesma regra da `percentual_da_renda`: uma casa, `ROUND_HALF_UP`, nulo sem
   renda). A % do total continua.
5. A reforma visual maior (tab bar com bolha, linhas SVG, ícones animados) fica para o Módulo 19,
   com o agente novo `ui-art-director`, porque pede dependências novas e muda regras do
   `docs/design.md`.

## 18a: backend

Casos de teste (pytest):

1. Com renda 5000, fixos 1200 e dívidas 333.33 no mês: `percentual_fixos` "24.0",
   `percentual_dividas` "6.7", `percentual_da_renda` "30.7".
2. Sem renda, os três percentuais são nulos.
3. O formato exato do JSON da rota inclui os dois campos novos.

## 18b: app

Casos de teste (Jest):

1. O cartão resumido mostra o mês em foco: com outubro zerado e novembro com valores, mostra
   "Novembro de 2026" e o total de novembro; não mostra as 6 linhas.
2. Sem nada a pagar em nenhum mês, mostra o mês atual.
3. Com renda, mostra "Renda: R$ 5.000,00", "24,0% da renda" (fixos) e "6,7% da renda" (dívidas);
   sem renda, o convite e nenhuma %.
4. Tocar no cartão abre a folha "Por mês" com as 6 linhas (nome do mês, detalhe, total, falta e %).
5. Na folha, "Editar renda" abre a folha "Renda mensal"; salvar manda o PATCH e relê a aba. Sem
   renda, o botão se chama "Informar renda".
6. Fechar a folha "Por mês" volta para a aba sem reler.
