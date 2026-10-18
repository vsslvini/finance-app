from datetime import date

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from planejamento.models import Configuracao, Divida, ParcelaDaDivida

SEM_CREDOR = "Informe para quem é a dívida."
VALOR_INVALIDO = "O valor precisa ser maior que zero."
PARCELAS_INVALIDAS = "As parcelas precisam ficar entre 1 e 120."
MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-11."

JOIA = {
    "credor": "Tia Ana",
    "motivo": "Joia",
    "valor_total": "1000.00",
    "parcelas": 3,
    "mes_inicio": "2026-11",
}


@pytest.fixture
def hoje_10_de_outubro(monkeypatch):
    # A view pergunta o dia com timezone.localdate() para saber o mês atual do
    # app (e decidir o "atrasada"); fixando outubro de 2026, o teste não muda
    # com o dia em que roda
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 10, 10))


def criar(cliente, **campos):
    # POST com a dívida da joia; cada teste troca só o que importa
    dados = {**JOIA, **campos}
    return cliente.post("/api/dividas/", dados, format="json")


def marcar(cliente, parcela_id, paga):
    return cliente.patch(f"/api/parcelas/{parcela_id}/", {"paga": paga}, format="json")


@pytest.mark.django_db
def test_rotas_de_dividas_sem_token_respondem_401():
    # Caso 9: sem token, todas as rotas de dívidas recusam com 401
    cliente = APIClient()

    respostas = [
        cliente.get("/api/dividas/"),
        cliente.post("/api/dividas/", JOIA, format="json"),
        cliente.patch("/api/dividas/1/", {"credor": "Tia"}, format="json"),
        cliente.delete("/api/dividas/1/"),
        cliente.patch("/api/parcelas/1/", {"paga": True}, format="json"),
    ]

    assert [resposta.status_code for resposta in respostas] == [401] * 5


def test_post_cria_a_divida_e_as_parcelas(cliente_com_token, hoje_10_de_outubro):
    # Caso 2: 201 com a dívida no formato da lista; as parcelas são geradas
    # (333,33 + 333,33 + 333,34, de novembro de 2026 a janeiro de 2027). Hoje
    # em outubro, nenhuma está atrasada
    resposta = criar(cliente_com_token)

    assert resposta.status_code == 201
    divida = Divida.objects.get()
    parcelas = list(divida.parcelas.order_by("numero"))
    assert resposta.json() == {
        "id": divida.id,
        "credor": "Tia Ana",
        "motivo": "Joia",
        "valor_total": "1000.00",
        "total_parcelas": 3,
        "parcelas_pagas": 0,
        "valor_pago": "0.00",
        "valor_restante": "1000.00",
        "proxima_parcela": {
            "id": parcelas[0].id,
            "numero": 1,
            "mes": "2026-11",
            "valor": "333.33",
            "atrasada": False,
        },
        "parcelas": [
            {
                "id": parcelas[0].id,
                "numero": 1,
                "mes": "2026-11",
                "valor": "333.33",
                "paga": False,
                "atrasada": False,
            },
            {
                "id": parcelas[1].id,
                "numero": 2,
                "mes": "2026-12",
                "valor": "333.33",
                "paga": False,
                "atrasada": False,
            },
            {
                "id": parcelas[2].id,
                "numero": 3,
                "mes": "2027-01",
                "valor": "333.34",
                "paga": False,
                "atrasada": False,
            },
        ],
    }


def test_post_sem_motivo_aceita_e_deixa_vazio(cliente_com_token):
    # Caso 2: o motivo é opcional; sem ele, fica ""
    dados = {**JOIA}
    del dados["motivo"]

    resposta = cliente_com_token.post("/api/dividas/", dados, format="json")

    assert resposta.status_code == 201
    assert resposta.json()["motivo"] == ""


def test_post_recusa_dados_invalidos(cliente_com_token):
    # Caso 2: cada dado errado recebe 400 com a mensagem combinada, e nada é
    # salvo (nem a dívida, nem parcelas). Cada linha: o campo trocado e o erro
    casos = [
        ({"credor": ""}, {"credor": [SEM_CREDOR]}),
        ({"credor": "   "}, {"credor": [SEM_CREDOR]}),
        ({"valor_total": "0.00"}, {"valor_total": [VALOR_INVALIDO]}),
        ({"valor_total": "-10.00"}, {"valor_total": [VALOR_INVALIDO]}),
        ({"parcelas": 0}, {"parcelas": [PARCELAS_INVALIDAS]}),
        ({"parcelas": 121}, {"parcelas": [PARCELAS_INVALIDAS]}),
        ({"mes_inicio": "11/2026"}, {"mes_inicio": [MES_INVALIDO]}),
        ({"mes_inicio": "2026-11-05"}, {"mes_inicio": [MES_INVALIDO]}),
    ]
    for campos, erro in casos:
        resposta = criar(cliente_com_token, **campos)

        assert resposta.status_code == 400
        assert resposta.json() == erro
    assert Divida.objects.count() == 0
    assert ParcelaDaDivida.objects.count() == 0


def test_post_sem_credor_recusa_com_a_mensagem(cliente_com_token):
    # Caso 2: sem o campo credor, a mesma mensagem de credor vazio
    dados = {**JOIA}
    del dados["credor"]

    resposta = cliente_com_token.post("/api/dividas/", dados, format="json")

    assert resposta.status_code == 400
    assert resposta.json() == {"credor": [SEM_CREDOR]}


def test_get_lista_a_mais_recente_primeiro(cliente_com_token):
    # Caso 3: duas dívidas; a cadastrada por último vem primeiro
    criar(cliente_com_token, credor="Tia Ana")
    criar(cliente_com_token, credor="Curso", parcelas=1)

    resposta = cliente_com_token.get("/api/dividas/")

    assert resposta.status_code == 200
    assert [divida["credor"] for divida in resposta.json()] == ["Curso", "Tia Ana"]


def test_get_traz_pago_restante_e_proxima_parcela(
    cliente_com_token, hoje_10_de_outubro
):
    # Caso 3: com a 1ª parcela paga, pagou 333,33, faltam 666,67, e a próxima
    # é a 2ª (dezembro)
    criar(cliente_com_token)
    primeira, segunda, _ = ParcelaDaDivida.objects.order_by("numero")
    marcar(cliente_com_token, primeira.id, True)

    divida = cliente_com_token.get("/api/dividas/").json()[0]

    assert divida["parcelas_pagas"] == 1
    assert divida["valor_pago"] == "333.33"
    assert divida["valor_restante"] == "666.67"
    assert divida["proxima_parcela"] == {
        "id": segunda.id,
        "numero": 2,
        "mes": "2026-12",
        "valor": "333.33",
        "atrasada": False,
    }


def test_parcela_atrasada_e_a_nao_paga_de_mes_anterior(cliente_com_token, monkeypatch):
    # Acréscimo ao caso 3: hoje 10/12/2026, dívida de outubro a dezembro.
    # Outubro não paga = atrasada; novembro paga = não atrasada; dezembro (o
    # mês atual) = não atrasada. A próxima parcela (outubro) vem atrasada
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 12, 10))
    criar(cliente_com_token, mes_inicio="2026-10")
    novembro = ParcelaDaDivida.objects.get(numero=2)
    marcar(cliente_com_token, novembro.id, True)

    divida = cliente_com_token.get("/api/dividas/").json()[0]

    atrasadas = [parcela["atrasada"] for parcela in divida["parcelas"]]
    assert atrasadas == [True, False, False]
    assert divida["proxima_parcela"]["mes"] == "2026-10"
    assert divida["proxima_parcela"]["atrasada"] is True


def test_atrasada_segue_o_mes_do_app(cliente_com_token, monkeypatch):
    # Acréscimo ao caso 3: com 2 dias antes, em 30/11/2026 o mês do app já é
    # dezembro, então a parcela não paga de novembro já está atrasada
    configuracao = Configuracao.atual()
    configuracao.dias_antes_do_mes = 2
    configuracao.save()
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 11, 30))
    criar(cliente_com_token, parcelas=1)

    divida = cliente_com_token.get("/api/dividas/").json()[0]

    assert divida["parcelas"][0]["atrasada"] is True


def test_get_com_tudo_pago_nao_tem_proxima_parcela(cliente_com_token):
    # Caso 3: com as 3 parcelas pagas, a próxima é null e não falta nada
    criar(cliente_com_token)
    for parcela in ParcelaDaDivida.objects.all():
        marcar(cliente_com_token, parcela.id, True)

    divida = cliente_com_token.get("/api/dividas/").json()[0]

    assert divida["parcelas_pagas"] == 3
    assert divida["valor_pago"] == "1000.00"
    assert divida["valor_restante"] == "0.00"
    assert divida["proxima_parcela"] is None


def test_patch_da_parcela_marca_e_desmarca(cliente_com_token, monkeypatch):
    # Caso 4: marcar grava "paga" e a data de hoje em paga_em; desmarcar volta
    # "paga" para falso e limpa paga_em. A resposta é a dívida inteira
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 11, 5))
    divida_id = criar(cliente_com_token).json()["id"]
    parcela = ParcelaDaDivida.objects.get(numero=1)

    marcada = marcar(cliente_com_token, parcela.id, True)

    assert marcada.status_code == 200
    assert marcada.json()["id"] == divida_id
    assert marcada.json()["parcelas_pagas"] == 1
    assert marcada.json()["parcelas"][0]["paga"] is True
    parcela.refresh_from_db()
    assert parcela.paga is True
    assert parcela.paga_em == date(2026, 11, 5)

    desmarcada = marcar(cliente_com_token, parcela.id, False)

    assert desmarcada.status_code == 200
    assert desmarcada.json()["parcelas_pagas"] == 0
    parcela.refresh_from_db()
    assert parcela.paga is False
    assert parcela.paga_em is None


def test_patch_da_divida_muda_credor_e_motivo(cliente_com_token):
    # Caso 5: o PATCH muda só "para quem" e o motivo; o valor mandado junto é
    # ignorado (para mudar o valor, apaga e cadastra de novo)
    divida_id = criar(cliente_com_token).json()["id"]

    resposta = cliente_com_token.patch(
        f"/api/dividas/{divida_id}/",
        {"credor": "Tia Maria", "motivo": "Anel", "valor_total": "5.00"},
        format="json",
    )

    assert resposta.status_code == 200
    assert resposta.json()["credor"] == "Tia Maria"
    assert resposta.json()["motivo"] == "Anel"
    assert resposta.json()["valor_total"] == "1000.00"
    divida = Divida.objects.get()
    assert divida.credor == "Tia Maria"
    assert divida.motivo == "Anel"


def test_patch_da_divida_recusa_credor_vazio(cliente_com_token):
    # Caso 5: o credor continua obrigatório na edição
    divida_id = criar(cliente_com_token).json()["id"]

    resposta = cliente_com_token.patch(
        f"/api/dividas/{divida_id}/", {"credor": ""}, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json() == {"credor": [SEM_CREDOR]}
    assert Divida.objects.get().credor == "Tia Ana"


def test_delete_apaga_a_divida_e_as_parcelas(cliente_com_token):
    # Caso 5: 204 sem corpo; a dívida e as 3 parcelas somem do banco
    divida_id = criar(cliente_com_token).json()["id"]

    resposta = cliente_com_token.delete(f"/api/dividas/{divida_id}/")

    assert resposta.status_code == 204
    assert Divida.objects.count() == 0
    assert ParcelaDaDivida.objects.count() == 0


def test_divida_ou_parcela_que_nao_existe_responde_404(cliente_com_token):
    # Casos 4 e 5: id que não existe recebe 404
    assert cliente_com_token.delete("/api/dividas/999/").status_code == 404
    assert marcar(cliente_com_token, 999, True).status_code == 404
