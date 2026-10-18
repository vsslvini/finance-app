from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from financas.models import Conexao, Conta, Transacao
from planejamento.models import GastoFixo, PagamentoDeGastoFixo

SEM_NOME = "Informe o nome do gasto."
VALOR_INVALIDO = "O valor precisa ser maior que zero."
DIA_INVALIDO = "O dia do vencimento precisa ficar entre 1 e 31."
MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-11."
TRECHO_CURTO = "O trecho precisa ter pelo menos 3 letras."

OUTUBRO = date(2026, 10, 1)
NOVEMBRO = date(2026, 11, 1)

APARTAMENTO = {
    "nome": "Apartamento",
    "valor": "500.00",
    "dia_vencimento": 5,
    "mes_inicio": "2026-10",
    "trecho_descricao": "DIRECIONAL",
}


@pytest.fixture(autouse=True)
def hoje_18_de_outubro(monkeypatch):
    # A view pergunta o dia com timezone.localdate() para saber o mês atual do
    # app; fixando outubro de 2026, o teste não muda com o dia em que roda
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 10, 18))


def criar_fixo(nome="Apartamento", valor="500.00", mes_inicio=OUTUBRO, trecho=""):
    return GastoFixo.objects.create(
        nome=nome,
        valor=Decimal(valor),
        mes_inicio=mes_inicio,
        trecho_descricao=trecho,
    )


@pytest.mark.django_db
def test_rotas_de_gastos_fixos_sem_token_respondem_401():
    # Caso 9: sem token, todas as rotas recusam com 401
    cliente = APIClient()

    respostas = [
        cliente.get("/api/gastos-fixos/"),
        cliente.post("/api/gastos-fixos/", APARTAMENTO, format="json"),
        cliente.patch("/api/gastos-fixos/1/", {"nome": "x"}, format="json"),
        cliente.delete("/api/gastos-fixos/1/"),
        cliente.put("/api/gastos-fixos/1/pagamentos/2026-10/"),
        cliente.delete("/api/gastos-fixos/1/pagamentos/2026-10/"),
    ]

    assert [resposta.status_code for resposta in respostas] == [401] * 6


def test_post_cria_o_gasto_fixo(cliente_com_token):
    # Caso 2: 201 com o gasto no formato da lista; ainda não pago em outubro
    resposta = cliente_com_token.post("/api/gastos-fixos/", APARTAMENTO, format="json")

    assert resposta.status_code == 201
    gasto = GastoFixo.objects.get()
    assert gasto.mes_inicio == OUTUBRO
    assert resposta.json() == {
        "id": gasto.id,
        "nome": "Apartamento",
        "valor": "500.00",
        "dia_vencimento": 5,
        "mes_inicio": "2026-10",
        "trecho_descricao": "DIRECIONAL",
        "este_mes": {"mes": "2026-10", "situacao": "a_pagar"},
    }


def test_post_so_com_o_obrigatorio_e_guarda_o_trecho_sem_espacos(cliente_com_token):
    # Caso 2: dia e trecho são opcionais; o trecho é guardado sem os espaços
    # das pontas
    dados = {"nome": "Internet", "valor": "100", "mes_inicio": "2026-10"}
    sem_trecho = cliente_com_token.post("/api/gastos-fixos/", dados, format="json")
    com_espacos = cliente_com_token.post(
        "/api/gastos-fixos/",
        {**dados, "nome": "Luz", "trecho_descricao": "  CAKTO  "},
        format="json",
    )

    assert sem_trecho.status_code == 201
    assert sem_trecho.json()["dia_vencimento"] is None
    assert sem_trecho.json()["trecho_descricao"] == ""
    assert com_espacos.status_code == 201
    assert GastoFixo.objects.get(nome="Luz").trecho_descricao == "CAKTO"


@pytest.mark.parametrize(
    "campo, valor, mensagem",
    [
        ("nome", "", SEM_NOME),
        ("nome", "   ", SEM_NOME),
        ("valor", "0", VALOR_INVALIDO),
        ("valor", "-5.00", VALOR_INVALIDO),
        ("dia_vencimento", 0, DIA_INVALIDO),
        ("dia_vencimento", 32, DIA_INVALIDO),
        ("mes_inicio", "2026-13", MES_INVALIDO),
        ("mes_inicio", "outubro", MES_INVALIDO),
        ("trecho_descricao", "ab", TRECHO_CURTO),
        ("trecho_descricao", "  ab  ", TRECHO_CURTO),
    ],
)
def test_post_recusa_dado_invalido_com_a_mensagem(
    cliente_com_token, campo, valor, mensagem
):
    # Caso 2: 400 com a mensagem do campo, e nada é salvo
    dados = {**APARTAMENTO, campo: valor}

    resposta = cliente_com_token.post("/api/gastos-fixos/", dados, format="json")

    assert resposta.status_code == 400
    assert resposta.json() == {campo: [mensagem]}
    assert GastoFixo.objects.count() == 0


def test_post_sem_nome_e_sem_mes_recusa(cliente_com_token):
    # Caso 2: campo que falta tem a mesma mensagem do campo vazio
    resposta = cliente_com_token.post(
        "/api/gastos-fixos/", {"valor": "10.00"}, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json()["nome"] == [SEM_NOME]
    assert resposta.json()["mes_inicio"] == [MES_INVALIDO]


def test_get_traz_os_campos_e_a_situacao_de_cada_gasto(cliente_com_token):
    # Caso 3: em ordem de nome, com a situação de outubro (mês atual do app):
    # pago sozinho (transação com o trecho), pago à mão, a pagar e um que só
    # começa em novembro
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    conta = Conta.objects.create(
        conexao=conexao, tipo="corrente", nome="Conta Nubank", saldo=Decimal(0)
    )
    Transacao.objects.create(
        conta=conta,
        data=date(2026, 10, 10),
        descricao="PIX direcional engenhar",
        valor=Decimal("-500.00"),
    )
    apartamento = criar_fixo("Apartamento", trecho="DIRECIONAL")
    apartamento.dia_vencimento = 5
    apartamento.save()
    internet = criar_fixo("Internet", "100.00")
    PagamentoDeGastoFixo.objects.create(gasto=internet, mes=OUTUBRO)
    energia = criar_fixo("Energia", "80.00")
    agua = criar_fixo("Água", "70.00", mes_inicio=NOVEMBRO)

    resposta = cliente_com_token.get("/api/gastos-fixos/")

    assert resposta.status_code == 200
    assert resposta.json() == [
        {
            "id": agua.id,
            "nome": "Água",
            "valor": "70.00",
            "dia_vencimento": None,
            "mes_inicio": "2026-11",
            "trecho_descricao": "",
            "este_mes": {"mes": "2026-10", "situacao": "nao_comecou"},
        },
        {
            "id": apartamento.id,
            "nome": "Apartamento",
            "valor": "500.00",
            "dia_vencimento": 5,
            "mes_inicio": "2026-10",
            "trecho_descricao": "DIRECIONAL",
            "este_mes": {"mes": "2026-10", "situacao": "pago_automatico"},
        },
        {
            "id": energia.id,
            "nome": "Energia",
            "valor": "80.00",
            "dia_vencimento": None,
            "mes_inicio": "2026-10",
            "trecho_descricao": "",
            "este_mes": {"mes": "2026-10", "situacao": "a_pagar"},
        },
        {
            "id": internet.id,
            "nome": "Internet",
            "valor": "100.00",
            "dia_vencimento": None,
            "mes_inicio": "2026-10",
            "trecho_descricao": "",
            "este_mes": {"mes": "2026-10", "situacao": "pago_manual"},
        },
    ]


def test_put_marca_como_pago_e_e_idempotente(cliente_com_token):
    # Caso 4: marcar duas vezes responde o fixo pago e deixa uma linha só
    gasto = criar_fixo()

    rota = f"/api/gastos-fixos/{gasto.id}/pagamentos/2026-10/"

    primeira = cliente_com_token.put(rota)
    segunda = cliente_com_token.put(rota)

    assert primeira.status_code == segunda.status_code == 200
    assert segunda.json()["este_mes"] == {"mes": "2026-10", "situacao": "pago_manual"}
    assert PagamentoDeGastoFixo.objects.filter(gasto=gasto, mes=OUTUBRO).count() == 1


def test_delete_do_pagamento_desmarca_e_e_idempotente(cliente_com_token):
    # Caso 4: desmarcar volta para "a pagar"; desmarcar de novo não dá erro
    gasto = criar_fixo()
    PagamentoDeGastoFixo.objects.create(gasto=gasto, mes=OUTUBRO)
    rota = f"/api/gastos-fixos/{gasto.id}/pagamentos/2026-10/"

    primeira = cliente_com_token.delete(rota)
    segunda = cliente_com_token.delete(rota)

    assert primeira.status_code == segunda.status_code == 200
    assert primeira.json()["este_mes"] == {"mes": "2026-10", "situacao": "a_pagar"}
    assert PagamentoDeGastoFixo.objects.count() == 0


@pytest.mark.parametrize("mes", ["2026-13", "outubro", "2026-10-05"])
def test_pagamento_com_mes_errado_responde_400(cliente_com_token, mes):
    # Caso 4: mês fora do formato AAAA-MM dá 400 com a mensagem de mês
    gasto = criar_fixo()

    marcar = cliente_com_token.put(f"/api/gastos-fixos/{gasto.id}/pagamentos/{mes}/")
    desmarcar = cliente_com_token.delete(
        f"/api/gastos-fixos/{gasto.id}/pagamentos/{mes}/"
    )

    assert marcar.status_code == desmarcar.status_code == 400
    assert marcar.json() == {"detail": MES_INVALIDO}
    assert PagamentoDeGastoFixo.objects.count() == 0


def test_pagamento_de_gasto_que_nao_existe_responde_404(cliente_com_token):
    resposta = cliente_com_token.put("/api/gastos-fixos/999/pagamentos/2026-10/")

    assert resposta.status_code == 404


def test_patch_muda_so_o_que_veio(cliente_com_token):
    # Caso 4: o PATCH parcial muda o valor e mantém o resto
    gasto = criar_fixo(trecho="DIRECIONAL")

    resposta = cliente_com_token.patch(
        f"/api/gastos-fixos/{gasto.id}/", {"valor": "650.00"}, format="json"
    )

    assert resposta.status_code == 200
    assert resposta.json()["valor"] == "650.00"
    assert resposta.json()["nome"] == "Apartamento"
    gasto.refresh_from_db()
    assert gasto.valor == Decimal("650.00")
    assert gasto.trecho_descricao == "DIRECIONAL"


def test_patch_recusa_trecho_curto_e_aceita_limpar(cliente_com_token):
    # Caso 2: no PATCH, o trecho de 2 letras é recusado; "" limpa o trecho
    gasto = criar_fixo(trecho="DIRECIONAL")
    rota = f"/api/gastos-fixos/{gasto.id}/"

    curto = cliente_com_token.patch(rota, {"trecho_descricao": "ab"}, format="json")
    vazio = cliente_com_token.patch(rota, {"trecho_descricao": ""}, format="json")

    assert curto.status_code == 400
    assert curto.json() == {"trecho_descricao": [TRECHO_CURTO]}
    assert vazio.status_code == 200
    gasto.refresh_from_db()
    assert gasto.trecho_descricao == ""


def test_delete_apaga_o_gasto_e_as_marcacoes(cliente_com_token):
    # Caso 4: 204, e as marcações de pago vão junto (CASCADE)
    gasto = criar_fixo()
    PagamentoDeGastoFixo.objects.create(gasto=gasto, mes=OUTUBRO)

    resposta = cliente_com_token.delete(f"/api/gastos-fixos/{gasto.id}/")

    assert resposta.status_code == 204
    assert GastoFixo.objects.count() == 0
    assert PagamentoDeGastoFixo.objects.count() == 0


def test_patch_e_delete_de_gasto_que_nao_existe_respondem_404(cliente_com_token):
    patch = cliente_com_token.patch("/api/gastos-fixos/999/", {"nome": "x"})
    delete = cliente_com_token.delete("/api/gastos-fixos/999/")

    assert patch.status_code == delete.status_code == 404
