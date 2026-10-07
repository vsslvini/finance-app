# Testes da sincronização

Explicação de `backend/financas/tests/test_sincronizacao.py` (16 testes), escrita em
2026-10-07. Os conceitos do pytest usados aqui (fixtures, `monkeypatch`, `pytest.raises`,
`db` e `@pytest.mark.django_db`) estão explicados em `docs/pytest.md`.

## A ideia geral

A função `sincronizar()` (em `financas/sincronizacao.py`) faz, para cada `Conexao`
cadastrada no admin:

1. pede uma chave à Pluggy (`pluggy.obter_api_key()`);
2. lista as contas da conexão (`pluggy.listar_contas()`) e cria ou atualiza cada `Conta`;
3. lista as transações de cada conta (`pluggy.listar_transacoes()`) e cria, atualiza ou
   apaga cada `Transacao`;
4. anota na `Conexao` quando terminou (`ultima_atualizacao`).

O `test_pluggy.py` já testa **como** o cliente conversa com a Pluggy (URLs, cabeçalhos,
páginas). Aqui a pergunta é outra: **dado o que a Pluggy devolveu, o nosso banco ficou
certo?** Por isso estes testes não trocam o `requests`; trocam as 3 funções do
`financas/pluggy.py` inteiras. É uma camada acima.

Diferença importante para o `test_pluggy.py`: aqui os testes **usam o banco de dados**
(criam e leem `Conexao`, `Conta` e `Transacao`). Por isso cada teste tem
`@pytest.mark.django_db`. O pytest-django usa um banco de teste separado e desfaz tudo no
fim de cada teste, então um teste nunca enxerga o que outro criou.

## Antes de tudo: `@pytest.fixture` e `monkeypatch` em 30 segundos

O guia completo está em `docs/pytest.md` (seções 3 e 4). O resumo:

- **`@pytest.fixture`** é uma etiqueta que o Python cola numa função (o `@` é um
  "decorador", recurso do Python). Ela avisa o pytest: "esta função prepara algo para os
  testes". Quando um teste tem um **parâmetro com o mesmo nome** da fixture, o pytest roda
  a fixture antes e passa o resultado para o teste. Você nunca escreve `conexao()`; basta
  pôr `conexao` nos parâmetros.
- **`monkeypatch`** é uma fixture que **já vem com o pytest** (está em
  `backend/.venv/lib/python3.14/site-packages/_pytest/monkeypatch.py`). Por isso não há
  `import` dela: é pedida pelo nome do parâmetro, como qualquer fixture. Ela troca uma
  função por outra só durante o teste e desfaz a troca sozinha quando o teste acaba.

Na prática, neste arquivo, quando o pytest roda `test_sincronizar_duas_vezes_nao_duplica(conexao, dados_pluggy)`:

1. vê o parâmetro `conexao`, acha a fixture `conexao`, que pede `db`: libera o banco e
   cria a conexão do Nubank;
2. vê o parâmetro `dados_pluggy`, acha a fixture `dados_pluggy`, que pede `monkeypatch`:
   troca as 3 funções da Pluggy pelas falsas e devolve o dicionário;
3. roda o teste com esses dois valores;
4. no fim, o `monkeypatch` desfaz as trocas e o pytest-django desfaz o banco.

## As peças de apoio (linhas 11 a 86)

### `conta_pluggy`, `cartao_pluggy` e `transacao_pluggy`

Funções que montam um dicionário **no formato da Pluggy** (os nomes em inglês, como
`balance` e `creditData`, são os da API; ver `docs/pluggy.md`). Cada uma tem valores padrão,
e o teste troca só o que importa para ele:

```python
transacao_pluggy(id="salario", amount=3000.0, type="CREDIT")
```

Isso funciona assim: `**campos` junta os argumentos nomeados num dicionário, e
`conta.update(campos)` sobrescreve os valores padrão com eles. Vantagem: cada teste mostra
só o que é diferente, e fica fácil ver o que ele está testando.

### Fixture `conexao` (linha 59)

Cria no banco uma `Conexao` do Nubank com `id_pluggy="item-nubank"`, como se você tivesse
cadastrado no admin. Ela pede a fixture `db` do pytest-django, que libera o acesso ao banco
(ver `docs/pytest.md`, seção 6). Qualquer teste que tenha `conexao` nos parâmetros recebe
essa conexão pronta.

### Fixture `dados_pluggy` (linha 65)

É a "Pluggy falsa". Ela:

- cria um dicionário `dados` com o que a Pluggy vai devolver: contas **por id do item**
  (`"item-nubank"`) e transações **por id da conta** (`"conta-corrente"`). O padrão é uma
  conta corrente com uma transação de padaria;
- troca as 3 funções do `financas.pluggy` por versões falsas que só leem desse dicionário.
  O `.get(item_id, [])` devolve lista vazia se o id não estiver lá;
- devolve o dicionário. Como dicionários em Python são compartilhados (não copiados), se o
  teste mudar `dados_pluggy[...]`, a Pluggy falsa passa a devolver o dado novo. É assim que
  os testes simulam "a Pluggy mudou entre uma sincronização e outra".

**Consequência para o código:** a troca é feita em `financas.pluggy.obter_api_key` (o nome
dentro do módulo). Para ela valer, o `sincronizacao.py` precisa chamar
`pluggy.obter_api_key()` (com `from financas import pluggy`). Se ele fizesse
`from financas.pluggy import obter_api_key`, guardaria a função original no momento do
import, e a troca não teria efeito: o teste tentaria ir à internet de verdade. É o mesmo
motivo do "Por que esse caminho" em `docs/pytest.md`, seção 4.

## Grupo 1: contas

### Teste 1: `test_conta_bank_vira_conta_corrente_da_conexao_certa`

**O que verifica:** uma conta `type: "BANK"` da Pluggy vira uma `Conta` com
`tipo="corrente"`, e cada conta fica ligada à conexão de onde veio.

- **Prepara:** além do Nubank (da fixture), cria uma conexão do Inter e coloca uma conta
  diferente para ela na Pluggy falsa.
- **Executa:** `sincronizar()`.
- **Confere:** a conta do Nubank tem tipo, nome e saldo certos e aponta para a conexão do
  Nubank; a conta do Inter aponta para a do Inter.

**Por que duas conexões:** com uma só, um código que ligasse tudo à primeira conexão
passaria. Com duas, ele é pego.

**Por que `Decimal("1500.50")`:** o saldo é um `DecimalField` (exato até o centavo, RNF04).
Comparamos com `Decimal` escrito como texto, que é exato.

### Teste 2: `test_conta_credit_vira_cartao_com_limites_e_datas`

**O que verifica:** uma conta `type: "CREDIT"` vira `tipo="cartao"`, e os dados de
`creditData` vão para os campos do cartão: limite total, limite disponível, fechamento e
vencimento.

**Detalhe das datas:** a Pluggy manda `"2026-10-20T00:00:00.000Z"` (texto com dia e hora);
o model guarda só o dia (`DateField`). O teste confere que vira `date(2026, 10, 20)`.

### Teste 3: `test_sincronizar_duas_vezes_nao_duplica`

**O que verifica:** rodar `sincronizar()` duas vezes com os mesmos dados não cria cópias.
Continua 1 conta e 1 transação.

**Por que importa:** você vai puxar a tela para baixo muitas vezes. Se cada vez criasse
linhas novas, os gastos apareceriam dobrados. Isso obriga o código a procurar a linha pelo
`id_pluggy` e atualizar, em vez de sempre criar (no Django, o `update_or_create` faz isso).
Por isso a `Conta` guarda o id da Pluggy (decisão de 2026-10-05).

### Teste 4: `test_saldo_novo_atualiza_a_conta_existente`

**O que verifica:** se o saldo muda na Pluggy, a **mesma** conta é atualizada.

- **Prepara:** sincroniza uma vez e guarda o `pk` (a chave primária, o id do nosso banco)
  da conta. Depois muda o `balance` na Pluggy falsa para 2000.
- **Confere:** o `pk` é o mesmo (é a mesma linha, não uma nova), o saldo é 2000 e continua
  existindo só 1 conta.

**Diferença para o teste 3:** o 3 prova que não duplica; o 4 prova que, além de não
duplicar, **atualiza**. Um código que só criasse se não existisse, sem atualizar, passaria no
3 e quebraria aqui.

## Grupo 2: como cada transação é gravada

### Teste 5: `test_sinal_do_valor_segue_o_type`

**O que verifica:** a decisão de 2026-10-06. O sinal do `valor` vem do `type`: `DEBIT`
(saída) vira negativo, `CREDIT` (entrada) vira positivo.

**Por que tem conta e cartão:** na conta corrente, o `amount` da Pluggy já vem com o sinal
"certo" (-45.90 no Pix enviado). No cartão, vem ao contrário: a compra vem positiva (120) e
o pagamento da fatura vem negativo (-850.25). Se o código copiasse o `amount`, a conta
passaria e o cartão quebraria. O teste cobre os 4 casos: DEBIT e CREDIT, na conta e no
cartão.

### Teste 6: `test_valor_quebrado_fica_exato_em_centavos`

**O que verifica:** um `amount` como `12.3` vira exatamente `Decimal("12.30")`.

**Por que existe:** a Pluggy manda números como `float`, que o computador guarda de forma
aproximada (`Decimal(12.3)` dá `12.300000000000000710...`). O jeito seguro é converter
passando por texto: `Decimal(str(12.3))` dá `12.3` exato. O teste confere o **resultado**
(o valor no banco é 12.30), não o caminho; o Django pode até arredondar ao salvar, mas o
teste garante que, de um jeito ou de outro, o centavo está certo (RNF04).

### Teste 7: `test_data_usa_so_o_dia_do_texto_da_pluggy`

**O que verifica:** a data `"2026-10-05T00:00:00.000Z"` vira `date(2026, 10, 5)`.

**Por que "só o dia":** decisão do passo 3: usar a data como vem, pegando só o `aaaa-mm-dd`.
Se o código convertesse o horário de UTC (o `Z` no fim) para o horário de Brasília (3 horas
a menos), meia-noite do dia 5 viraria 21h do dia 4, e a transação cairia no dia errado. No
teste real (passo 4 dos próximos passos) vamos conferir se as datas batem com o app do
banco.

### Teste 8: `test_parcelas_vem_do_credit_card_metadata`

**O que verifica:** compras parceladas no cartão trazem
`creditCardMetadata: {"installmentNumber": 3, "totalInstallments": 10}` ("parcela 3 de
10"). Isso vai para `parcela_atual` e `total_parcelas`. Uma compra à vista (sem esse campo)
fica com os dois `None`.

**Por que importa:** é a base do RF13 (estimar as faturas futuras). E o caso "sem o campo"
garante que o código não quebra (`KeyError`) quando a transação não é parcelada, que é o
caso mais comum.

### Teste 9: `test_sem_category_fica_sem_categoria`

**O que verifica:** a categoria pode faltar de dois jeitos: o campo nem vem (`del
sem_campo["category"]` apaga a chave do dicionário) ou vem `None`. Nos dois casos,
`categoria_pluggy` fica `""` (texto vazio) e `categoria_exibida` mostra `"Sem categoria"`.

**Por que os dois jeitos:** `dicionario["category"]` quebra quando o campo não vem;
`dicionario.get("category")` devolve `None`, e `None` não pode ir para um campo de texto
sem `null=True`. O código precisa tratar os dois (por exemplo, `get("category") or ""`).
Lembra da dúvida 3 dos requisitos: depois do período de teste, a categoria pode parar de
vir.

**O `for` no fim:** passa pelas 2 transações e confere as duas coisas em cada uma.

### Teste 10: `test_categoria_manual_continua_depois_de_sincronizar`

**O que verifica:** se você trocou a categoria de um gasto (RF08), a próxima sincronização
não apaga a sua escolha.

- **Prepara:** sincroniza, depois grava `categoria_manual="Mercado"` direto no banco (como
  se fosse o `PATCH` do app).
- **Confere:** depois de sincronizar de novo, a categoria manual continua lá.

**O que obriga o código a fazer:** atualizar só os campos que vêm da Pluggy (data,
descrição, valor, `categoria_pluggy`, parcelas) e nunca mexer em `categoria_manual`.

## Grupo 3: transações que sumiram

Decisão de 2026-10-06: a Pluggy pode recriar uma transação com id novo (por exemplo, quando
uma compra pendente é confirmada). Se a gente nunca apagasse nada, a transação velha
ficaria duplicada. Então apagamos as transações da Pluggy que não vieram mais, **mas só
dentro do período que a Pluggy devolveu** (da menor à maior data recebida). Os testes 11 a
13 cercam essa regra pelos três lados, e o 16 garante que ela vale por conta.

### Teste 11: `test_transacao_que_sumiu_dentro_do_periodo_e_apagada`

- **Prepara:** primeira sincronização com transações dos dias 1, 5 e 10. Depois a Pluggy
  falsa passa a devolver só as dos dias 1 e 10.
- **Confere:** a do dia 5 foi apagada (está entre 1 e 10, e não veio) e sobraram 2.

`assert not ....exists()` quer dizer "confere que **não** existe".

### Teste 12: `test_transacao_antiga_fora_do_periodo_continua`

- **Prepara:** primeira sincronização com `setembro` (dia 1/9) e `dia-10`. Na segunda, a
  Pluggy devolve só os dias 5 e 10 de outubro.
- **Confere:** `setembro` continua (é mais antiga que o dia 5, o começo do período
  devolvido), e são 3 no total: setembro, dia 5 (nova) e dia 10.

**Por que importa:** a Pluggy só devolve um pedaço do histórico. Sem esse limite, cada
sincronização apagaria tudo o que é mais antigo que esse pedaço, e você perderia o
histórico (e as categorias manuais dele).

### Teste 13: `test_transacao_manual_nunca_e_apagada`

- **Prepara:** sincroniza com os dias 1 e 10; depois cria uma transação manual ("Feira", dia
  5), sem `id_pluggy` (fica `None`, como no RF10).
- **Confere:** depois de sincronizar de novo, a manual continua, mesmo estando dentro do
  período e não vindo da Pluggy (claro: ela nunca veio de lá).

`id_pluggy__isnull=True` é o jeito do Django de filtrar "onde `id_pluggy` é NULL".

**O que obriga o código a fazer:** ao procurar o que apagar, olhar só as transações com
`id_pluggy` preenchido.

### Teste 16: `test_transacao_de_outra_conta_nao_e_apagada`

Caso sugerido pelo Claude e aprovado pelo Vinicius em 2026-10-07; escrito pelo
`python-backend-engineer`.

**O que verifica:** a regra de apagar vale **por conta**. Uma compra do cartão não pode ser
apagada só porque não veio na lista da conta corrente.

- **Prepara:**
  - o Nubank tem conta corrente e cartão;
  - primeira sincronização: a conta corrente tem os dias 1 e 10/10 (período de 1 a 10); o
    cartão tem `compra-cartao` no dia 5/10, **dentro** desse período;
  - depois, a Pluggy falsa passa a devolver lista vazia para o cartão.
- **Executa:** `sincronizar()` de novo.
- **Confere:** `compra-cartao` continua, e são 3 transações no total (nada apagado, nada
  duplicado).

**O código errado que ele pega:** um código que apaga "tudo da Pluggy entre 1 e 10/10 que
não veio", sem filtrar pela conta. Ao processar a conta corrente, ele apagaria
`compra-cartao`, porque ela está no período e não está na lista da conta corrente.

**Por que o cartão volta vazio (e não com a compra de novo):** se o cartão devolvesse a
compra outra vez, o código errado poderia apagá-la (na conta corrente) e logo depois
recriá-la (no cartão), e o teste passaria por engano. Com a lista vazia, o código errado
falha em qualquer ordem em que as contas forem processadas. Já o código certo não apaga
nada do cartão: lista vazia não tem menor nem maior data, então não há período, e pela
regra nada dessa conta é apagado.

**O que obriga o código a fazer:** ao apagar, filtrar pela conta, por `id_pluggy`
preenchido e pelo período **daquela conta**; e pular a conta quando a lista vier vazia
(calcular `min()` de uma lista vazia daria erro).

## Grupo 4: o fim da sincronização

### Teste 14: `test_erro_no_meio_nao_salva_nada`

**O que verifica:** se a Pluggy falhar no meio, o banco fica como estava antes, sem metade
dos dados.

- **Prepara:** além da Pluggy falsa, troca **de novo** o `listar_transacoes`, agora por uma
  função que lança `HTTPError` (como uma Pluggy fora do ar, erro 500). O `monkeypatch`
  aceita trocar a mesma coisa duas vezes; vale a última. Assim, as contas são listadas
  normalmente e o erro acontece **depois**.
- **Confere:**
  - o erro sobe (`pytest.raises`), como no teste 2 do `test_pluggy.py`;
  - nenhuma conta foi salva, mesmo a que já tinha sido listada;
  - nenhuma transação;
  - a conexão não foi marcada como atualizada. O `refresh_from_db()` relê a conexão do
    banco; sem ele, olharíamos a cópia antiga que está na memória do teste.

**O que obriga o código a fazer:** rodar tudo dentro de `transaction.atomic()` (decisão do
passo 3). O `atomic` funciona como "tudo ou nada": se der erro lá dentro, o banco desfaz o
que foi feito desde o começo do bloco.

### Teste 15: `test_ultima_atualizacao_preenchida_ao_terminar`

**O que verifica:** quando dá tudo certo, a conexão guarda quando foi atualizada (é o que o
app vai mostrar no RF24, "última atualização").

**Por que só `is not None`:** o horário exato muda a cada execução, então o teste só confere
que o campo foi preenchido. Junto com o teste 14, fica: deu certo, preenche; deu erro, não
preenche.
