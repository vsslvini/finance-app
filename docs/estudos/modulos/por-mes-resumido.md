# Módulo 18: cartão "Por mês" resumido

Escrito em 2026-10-18. Pedido do Vinicius: o cartão "Por mês" do Módulo 17 mostrava 6 linhas de
uma vez e ficou carregado. Agora o cartão é um resumo, e os detalhes ficam numa folha. Plano em
[`../../planos/modulo-18-por-mes-resumido.md`](../../planos/modulo-18-por-mes-resumido.md).
**Antes, estude** [`planejamento-por-mes.md`](planejamento-por-mes.md).

## 1. O que o módulo entrega

- **Cartão resumido** (tocável inteiro, com uma seta à direita): a renda (ou o convite para
  informar), o **mês em foco** com o total, e as linhas "Gastos fixos" e "Dívidas", cada uma com
  o valor e a % da renda com uma barra.
- **Folha "Por mês"**: abre ao tocar no cartão (o cartão responde ao toque, e a folha sobe com a
  animação de entrada das folhas). Tem a renda com "Editar renda" (ou "Informar renda") e as 6
  linhas do Módulo 17.
- Backend: cada mês de `GET /api/a-pagar/` ganhou `percentual_fixos` e `percentual_dividas`.

## 2. Mês em foco

É o primeiro dos 6 meses com algo a pagar (`falta` maior que zero); se nenhum tiver, o mês atual.
Por quê: a pergunta do planejamento é "quanto vou pagar na próxima vez". Os fixos do Vinicius
começam no mês que vem, e o mês atual mostraria zero. A escolha fica no app (função `mesEmFoco`
em `src/componentes/CartaoPorMes.tsx`): não é regra de dinheiro, é só qual linha mostrar.

## 3. O fluxo

1. A aba (`src/app/(abas)/dividas.tsx`) busca `/api/a-pagar/` junto com as outras rotas e passa a
   resposta ao `CartaoPorMes`.
2. Tocar no cartão liga o estado `porMesAberto`, e a `FolhaPorMes` aparece.
3. "Fechar" só desliga o estado (nada mudou, então não relê).
4. "Editar renda" fecha a folha "Por mês" e abre a `FolhaDeEdicao` da renda (duas folhas são dois
   `Modal`, e abertos juntos dão problema). Salvar a renda relê a aba, e as % mudam.

## 4. Arquivos

- Backend: `planejamento/views.py` (os dois percentuais, com a mesma `percentual_da_renda`) e
  `serializers.py` (`DecimalField` com uma casa, nulo permitido).
- App: `api.ts` (campos novos), `componentes/CartaoPorMes.tsx` (o resumo e `mesEmFoco`),
  `componentes/FolhaPorMes.tsx` (nova, com o conteúdo antigo do cartão), `app/(abas)/dividas.tsx`.

O cartão é um `Pressable` sem `accessibilityLabel`: o leitor de tela lê o próprio texto do cartão
e a dica "Toque para ver os 6 meses".

## 5. Os testes

Backend (`planejamento/tests/test_api_a_pagar.py`):

- Renda 5000, fixo 1200 e parcela 333,33: fixos "24.0", dívidas "6.7", total "30.7".
- Sem renda, os três percentuais são nulos.
- O formato exato do JSON tem os campos novos.

App (`__tests__/dividas-test.tsx`), cartão:

1. Com outubro zerado, o cartão mostra novembro (o mês em foco) e não mostra as 6 linhas.
2. Tudo zerado: mostra o mês atual.
3. Com renda, a renda e as duas %; sem renda, o convite e nenhuma %.

App, folha:

4. Tocar abre a folha com as 6 linhas; antes do toque, "Março de 2027" não existe na tela.
5. "Editar renda" abre a folha "Renda mensal" preenchida; sem renda, o botão é "Informar renda".
6. Salvar a renda manda o `PATCH` e relê; "Fechar" não relê.

Um teste falhou na primeira rodada: esperava um título "Por mês" só, mas com a folha aberta o
cartão continua embaixo dela, e são dois. O código estava certo; o teste foi corrigido
(`getAllByRole(...)` com tamanho 2). É o aprendizado de 2026-10-17 de novo: quando um teste
falha, confira primeiro se o teste está certo.

## 6. Para testar à mão

No celular, aba "A pagar": confira o mês em foco e as %; toque no cartão, veja os 6 meses, toque
em "Editar renda", mude e salve.
