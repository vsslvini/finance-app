# Módulo 7: faturas futuras

Escrito em 2026-10-17. Atende RF13. Plano em
[`../../planos/modulo-7-faturas-futuras.md`](../../planos/modulo-7-faturas-futuras.md). **Antes,
estude** [`guardado-backend.md`](guardado-backend.md) (funções puras e services) e
[`resumo-do-mes.md`](resumo-do-mes.md) (somas com `Decimal`).

Este documento cobre o **7a (backend)** e o **7b (a seção na aba Cartões)**, na seção 10.

## 1. O que o módulo entrega

- `GET /api/faturas-futuras/` (com token): os 6 meses seguintes ao mês atual do app, cada um com
  o total estimado das faturas e o total por cartão.
- 14 testes novos; o backend passa a ter 151.

Com os dados reais de 2026-10-17, a rota estimou: novembro R$ 231,26 (Inter R$ 77,07 e PicPay
R$ 154,19), dezembro R$ 38,27 e janeiro R$ 35,81.

## 2. Por que "estimar"

A Pluggy manda cada parcela só no mês em que ela é cobrada: a parcela 3 de 6 aparece na fatura
de novembro, a 4 de 6 só chega em dezembro. Não existe uma lista pronta das parcelas que faltam.
Então o backend **projeta**: se a última parcela vista de uma compra é a 3 de 6, em outubro, as
parcelas 4, 5 e 6 caem em novembro, dezembro e janeiro, com o mesmo valor.

## 3. A regra, passo a passo

1. Só transações de cartão, com valor negativo (compra) e parcela entre 1 e o total. Isso tira
   os estornos e o ruído das renegociações do Nubank (que chegam com coisas como "parcela 3
   de 1").
2. **Série**: as parcelas da mesma compra têm a mesma conta, o mesmo número de parcelas, o mesmo
   valor e a mesma descrição sem o " 2/6" do fim. A chave da série é uma tupla com esses quatro.
3. De cada série, fica só a **última parcela vista** (a maior; no empate, a mais recente). Assim
   uma compra vista em agosto, setembro e outubro conta uma vez só.
4. A parcela `a` de `n`, no mês M, cobra `a, a+1, ..., n` nos meses `M, M+1, ..., M+(n-a)`.
5. Soma, em valor positivo, o que cai em cada um dos 6 meses seguintes ao mês atual do app.

## 4. Conceitos novos

- **Expressão regular** (`re`): `r"\s+\d+/\d+\s*$"` acha " 2/6" no fim do texto. `\s+` é um ou
  mais espaços, `\d+` um ou mais dígitos, `/` a barra, e `$` o fim do texto (assim um "2/6" no
  meio da descrição fica). `SUFIXO_PARCELA.sub("", descricao)` troca o que achou por nada.
- **Tupla como chave de dicionário**: `ultimas[(conta, total, valor, descricao)]` guarda uma
  transação por série. Tuplas podem ser chave porque não mudam depois de criadas.
- **Comparar tuplas**: `(parcela, data) > (outra_parcela, outra_data)` compara primeiro a
  parcela e, só se empatar, a data. É o desempate da regra 3 numa linha.
- **`divmod` para somar meses**: `divmod(ano * 12 + (mes - 1) + quantos, 12)` devolve o ano e o
  índice do mês; dezembro de 2026 mais 1 vira janeiro de 2027 sem nenhum `if`.
- **Função pura com objetos do model**: `projetar_parcelas` recebe qualquer lista de objetos com
  os campos da `Transacao`. Nos testes, `Transacao(...)` sem `save()` cria o objeto sem tocar no
  banco; no service, o queryset vai direto.

## 5. O caminho de uma requisição

1. `financas/urls.py` liga `faturas-futuras/` à view `faturas_futuras`.
2. A view lê os dias antes da `Configuracao` e chama `estimar_faturas(hoje, dias_antes)`.
3. `estimar_faturas` acha o mês atual do app (`mes_atual`), busca as transações de cartão e chama
   `projetar_parcelas`, que devolve os 6 meses com `{id da conta: total}`.
4. O service troca os ids pelos cartões (banco e nome, na ordem do `GET /api/contas/`).
5. O `FaturasFuturasSerializer` transforma os `Decimal` em texto.

## 6. Arquivos

- `financas/services/faturas_futuras.py` (novo): `descricao_sem_parcela`, `somar_meses`,
  `parcela_valida`, `projetar_parcelas` (pura) e `estimar_faturas` (com banco).
- `financas/serializers.py`: `CartaoFuturoSerializer`, `MesFuturoSerializer` e
  `FaturasFuturasSerializer`.
- `financas/views.py` e `urls.py`: a view e a rota.
- `docs/arquitetura.md`: a linha da rota.

## 7. Os testes

`financas/tests/test_faturas_futuras.py` (8 sem banco, 3 com banco) e
`financas/tests/test_api_faturas_futuras.py` (3). Rodar:
`pytest -v financas/tests/test_faturas_futuras.py financas/tests/test_api_faturas_futuras.py`.

- Caso 1, `test_compra_em_6x_projeta_as_parcelas_que_faltam`: 2 de 6 em outubro enche novembro a
  fevereiro, e março fica zero.
- Caso 2, `test_serie_vista_em_varios_meses_conta_uma_vez_so` e
  `test_empate_na_parcela_vale_a_data_mais_recente`: não duplica.
- Caso 3, `test_parcela_com_data_futura_conta_uma_vez_e_segue_dela`: a parcela que já veio com
  data de novembro conta em novembro e a projeção segue dela.
- Caso 4, `test_sufixo_da_parcela_e_ignorado_na_descricao` e
  `test_descricao_sem_parcela_tira_so_o_sufixo_do_fim`.
- Caso 5, `test_ignora_estorno_parcela_sem_sentido_sem_parcela_e_serie_terminada` e
  `test_ignora_parcela_da_conta_corrente`.
- Caso 6, `test_dois_cartoes_somam_no_mes_e_aparecem_separados`: o Nubank é criado antes do
  Inter, para provar que a ordem vem do nome do banco, não da criação. (Esse teste veio do agente
  com um dado errado, a parcela 2 de 3 esperando dezembro; foi corrigido para 1 de 3. O teste
  vermelho mostrou que o código estava certo e o teste, não.)
- Caso 7, `test_sempre_6_meses_depois_do_atual_com_virada_de_ano`,
  `test_comeca_depois_do_mes_atual_do_app_com_dias_antes` e
  `test_faturas_futuras_usa_os_dias_antes_da_configuracao`.
- Caso 8, `test_faturas_futuras_sem_token_responde_401` e
  `test_faturas_futuras_traz_o_formato_e_dinheiro_como_texto`.

## 8. Testar à mão

```fish
curl -H "Authorization: Token $TOKEN" http://127.0.0.1:8000/api/faturas-futuras/
```

## 9. Limites

- O mês da parcela é o mês da data da transação, não o mês da fatura: uma compra depois do
  fechamento cai na fatura seguinte, e a Pluggy não manda a data de fechamento (RF14).
- Compras que a Pluggy ainda não mandou não entram.
- Duas compras iguais no mesmo cartão (mesma descrição, valor e parcelas) viram uma série só.
- Um sufixo sem espaço antes ("LOJA2/6") não é reconhecido.

## 10. 7b: a seção "Próximas faturas" na aba Cartões

Embaixo dos cartões: o título "Próximas faturas", a frase "Estimativa pelas compras parceladas que
a Pluggy enviou." e um cartão com os 6 meses ("Novembro de 2026" à esquerda, "R$ 231,26" à
direita). Num mês com mais de um cartão, aparece uma linha por cartão ("Inter: R$ 77,07"). Se
todos os meses vierem zerados: "Nenhuma parcela futura encontrada.". Sem nenhum cartão, a seção
não aparece.

- `src/api.ts`: tipos `CartaoFuturo`, `MesFuturo` e `FaturasFuturas`, e `buscarFaturasFuturas()`.
- `src/componentes/ProximasFaturas.tsx` (novo): desenha a seção a partir da lista de meses.
- `src/app/(abas)/cartoes.tsx`: `buscarDadosDosCartoes` busca as contas e as faturas juntas com
  **`Promise.all`**, que espera as duas promessas e falha se qualquer uma falhar. É essa função
  (fora do componente, para ser sempre a mesma) que o `useCarga` usa; assim "Tentar de novo" e
  puxar para baixo já buscam as duas.
- Acessibilidade: cada mês é um bloco lido como "Novembro de 2026: 231,26 reais"; as linhas por
  cartão ficam fora desse bloco (senão o leitor de tela pularia), cada uma com o rótulo
  "Inter: 77,07 reais".

Testes (`__tests__/cartoes-test.tsx`, 8 novos; o app passa a ter 111): o servidor falso responde
também `/api/faturas-futuras/` (por padrão, 6 meses zerados, para os testes antigos não mudarem).

- Caso 1: título, explicação, "Novembro de 2026", "R$ 231,26" e o rótulo do mês.
- Caso 2 (dois testes): novembro mostra "Inter: R$ 77,07" e "PicPay: R$ 154,19"; dezembro, com
  um cartão só, não mostra o detalhe.
- Caso 3: tudo zerado mostra "Nenhuma parcela futura encontrada." e nenhum mês.
- Caso 4 (dois testes): a tela pede a rota; com 500 nas faturas, aparece o erro, e "Tentar de
  novo" busca as duas rotas de novo.
- Caso 5: puxar para baixo busca as duas rotas e mostra "R$ 300,00".
- Caso 6: sem cartão, a seção não aparece.

Limite do 7b: com dois cartões do mesmo banco no mesmo mês, as linhas por cartão mostram o mesmo
nome de banco.
