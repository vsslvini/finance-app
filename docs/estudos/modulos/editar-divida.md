# Módulo 15: editar dívida

Escrito em 2026-10-18. Pedido do Vinicius: a dívida não podia ser editada, e todo erro de
digitação obrigava a apagar e cadastrar de novo. Agora funciona como nos gastos fixos. Plano em
[`../../planos/modulo-15-editar-divida.md`](../../planos/modulo-15-editar-divida.md).
**Antes, estude** [`dividas.md`](dividas.md) (como as parcelas nascem) e
[`gasto-previsto-e-fixos.md`](gasto-previsto-e-fixos.md) (a folha que serve para cadastrar e
editar).

## 1. O que o módulo entrega

- Na folha da dívida (a das parcelas), o botão **"Editar dívida"** abre o formulário do cadastro
  já preenchido. O "Apagar dívida" desceu para uma linha própria, como no gasto fixo.
- Dá para mudar tudo: para quem, motivo, valor total, parcelas e mês da primeira parcela.
- Mudou valor, parcelas ou mês: as parcelas são **geradas de novo**, com a mesma regra do
  cadastro (a última leva a sobra dos centavos).
- **Com alguma parcela paga**, só "para quem" e o motivo mudam. O formulário esconde os outros
  campos e mostra o aviso "Com parcela paga, só dá para mudar para quem e o motivo. Para mudar o
  valor, desmarque as parcelas pagas."

## 2. Por que travar com parcela paga

Imagine 1000 em 3x, com a 1ª parcela (333,33) já paga por PIX. Se você trocar para 1200 em 3x e
o app gerar as parcelas de novo, a 1ª vira 400 e continua "paga". Só que o PIX que saiu da conta
foi de 333,33: o "pago" e o "falta" deixariam de bater com o dinheiro de verdade. Travar é a
solução simples; para corrigir, desmarque as pagas, edite e marque de novo.

Detalhe importante: o app manda o formulário inteiro. Se o backend travasse sempre que viesse um
`valor_total`, nenhuma dívida com parcela paga poderia mudar nem o credor. Por isso o backend só
trava quando o valor, as parcelas ou o mês são **diferentes** do que está salvo.

## 3. O fluxo de uma edição, do toque ao banco

1. A aba "A pagar" (`src/app/(abas)/dividas.tsx`) mostra os cartões; tocar num deles abre a
   `FolhaDaDivida`.
2. "Editar dívida" chama `aoEditar(divida, mudou)`. A folha entrega a dívida **como está agora**
   (se você marcou uma parcela antes de tocar em editar, ela já vem marcada). Sem isso, a aba
   usaria a dívida velha e liberaria campos que o backend vai recusar.
3. A aba fecha a folha das parcelas e abre a `FolhaDoCadastroDeDivida` com a dívida. As duas são
   `Modal`, e dois abertos ao mesmo tempo dão problema, por isso uma fecha antes.
4. Ao salvar, a folha confere os campos no próprio app e chama `editarDivida(id, dados)`
   (`src/api.ts`), que faz `PATCH /api/dividas/<id>/`.
5. No backend, a view `divida` (`planejamento/views.py`) passa os dados pelo
   `EditarDividaSerializer` com `partial=True` (só os campos mandados). Ele herda do
   `NovaDividaSerializer`, então valida igual ao cadastro.
6. O `save()` do serializer chama o `update()`, que chama `editar_divida` em
   `planejamento/services/dividas.py`. Ela decide se precisa gerar as parcelas de novo e, se
   houver parcela paga, levanta `DividaComParcelaPaga`, que vira 400 com
   `{"detail": ["Com parcela paga, ..."]}`.
7. Tudo dentro de `@transaction.atomic`: se algo falhar no meio, nem a dívida nem as parcelas
   ficam pela metade.
8. A resposta é a dívida no formato da lista (agora com `mes_inicio`, "2026-11"); a aba fecha a
   folha e relê a lista.

## 4. Cada arquivo e o porquê

Backend (`backend/planejamento/`):

- `services/dividas.py`: `editar_divida` e a exceção `DividaComParcelaPaga`. Exceção própria em
  vez de `ValueError`, porque um `ValueError` pode vir de qualquer lugar e seria confundido com a
  regra. A conferência da parcela paga vem **antes** de mudar qualquer campo, para o erro não
  deixar nada pela metade (nem o credor).
- `serializers.py`: `EditarDividaSerializer` herda do `NovaDividaSerializer` (não copia as
  validações) e traduz a exceção para `ValidationError`; `DividaSerializer` ganhou `mes_inicio`.
- `views.py`: só o comentário mudou.
- `models.py`: o comentário da `Divida` dizia que só credor e motivo mudavam.

App (`mobile/src/`):

- `api.ts`: `Divida.mes_inicio` e `editarDivida`, com `Partial<NovaDivida>` (pode mandar só
  alguns campos).
- `componentes/FolhaDoCadastroDeDivida.tsx`: era a `FolhaDeNovaDivida`; agora recebe
  `divida?`, como a `FolhaDoGastoFixo`. Sem dívida, cadastra; com dívida, edita. `travada` é
  calculada na renderização (`parcelas_pagas > 0`), sem estado extra.
- `componentes/FolhaDaDivida.tsx`: o botão "Editar dívida" e o "Apagar" numa linha própria.
- `app/(abas)/dividas.tsx`: o estado `editando` e a troca de uma folha pela outra.

## 5. Os testes

Backend (`planejamento/tests/test_api_dividas.py`):

- `test_patch_da_divida_muda_credor_e_motivo`: mudar só texto não mexe no dinheiro; confere que
  os ids das parcelas são os mesmos (não foram geradas de novo).
- `test_patch_com_valor_e_parcelas_novos_regera_as_parcelas`: 1000 em 3x vira 1200 em 4x; quatro
  parcelas de 300, de novembro a fevereiro (a virada do ano sai certa).
- `test_patch_com_mes_novo_regera_os_meses`: trocar o mês para 2027-03 gera março, abril e maio.
- `test_patch_com_parcela_paga_recusa_mudar_o_valor`: com a 1ª paga, valor novo dá 400, e nada
  muda (nem o credor mandado junto).
- `test_patch_com_parcela_paga_aceita_o_formulario_com_os_mesmos_valores`: o formulário inteiro,
  com os mesmos valores e um credor novo, passa; a parcela continua paga.
- `test_patch_da_divida_recusa_dados_invalidos`: valor zero, 0 ou 121 parcelas, mês "13/2026" e
  credor vazio dão as mesmas mensagens do cadastro.
- `test_resposta_da_divida_traz_mes_inicio`: GET e PATCH trazem "2026-11".
- `test_post_cria_a_divida_e_as_parcelas` mudou só para esperar o `mes_inicio` na resposta.

Backend (`planejamento/tests/test_dividas.py`, o service direto, sem HTTP):

- `test_editar_divida_com_valores_iguais_nao_regera_as_parcelas`: `Decimal(1000)` e o `1000.00`
  salvo são iguais para o Python, então não conta como mudança.
- `test_editar_divida_com_parcela_paga_levanta_o_erro_e_nada_muda`: `pytest.raises` confere que
  a exceção sai, e o credor fica como estava.

App (`mobile/__tests__/dividas-test.tsx`, bloco "Editar dívida (15b)"; o servidor falso responde
ao `PATCH`):

1. "Editar dívida" abre a folha com o título e os cinco campos preenchidos ("1.000,00", "3",
   "11/2026"), e a folha das parcelas fecha.
2. Mudar valor e parcelas e salvar manda o `PATCH` com `"1200.00"` e `4`, fecha a folha e relê a
   lista (a lista é pedida duas vezes).
3. Com parcela paga, os três campos somem, o aviso aparece e o `PATCH` leva só credor e motivo.
4. Se a API recusa, a folha continua aberta com a mensagem.

Os testes antigos de nova dívida e de apagar continuaram passando sem mudança: eles procuram os
botões pelo texto, e os textos não mudaram.

## 6. Para testar à mão

Com o `runserver` no ar (troque o `1` pelo id de uma dívida):

```fish
curl -X PATCH -H "Authorization: Token $TOKEN" -H "Content-Type: application/json" \
  -d '{"valor_total": "1200.00", "parcelas": 4}' \
  http://127.0.0.1:8000/api/dividas/1/
```

Sem parcela paga, a resposta traz quatro parcelas novas. Marque uma como paga e repita com outro
valor: a resposta é 400 com a mensagem da parcela paga.

No celular: aba "A pagar", toque numa dívida, "Editar dívida", mude o valor e salve.
