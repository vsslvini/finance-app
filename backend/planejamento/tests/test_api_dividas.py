from datetime import date

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from planejamento.models import Configuracao, Divida, ParcelaDaDivida

SEM_CREDOR = "Informe para quem é a dívida."
VALOR_INVALIDO = "O valor precisa ser maior que zero."
PARCELAS_INVALIDAS = "As parcelas precisam ficar entre 1 e 120."
MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-11."
COM_PARCELA_PAGA = "Com parcela paga, só dá para mudar para quem e o motivo."

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
        "mes_inicio": "2026-11",
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


def editar(cliente, divida_id, **campos):
    return cliente.patch(f"/api/dividas/{divida_id}/", campos, format="json")


def test_patch_da_divida_muda_credor_e_motivo(cliente_com_token):
    # Caso 15a-1: mudando só "para quem" e o motivo, as parcelas ficam como
    # estão (os mesmos ids; não foram apagadas e recriadas)
    divida_id = criar(cliente_com_token).json()["id"]
    ids_antes = list(ParcelaDaDivida.objects.order_by("numero").values_list("id"))

    resposta = editar(cliente_com_token, divida_id, credor="Tia Maria", motivo="Anel")

    assert resposta.status_code == 200
    assert resposta.json()["credor"] == "Tia Maria"
    assert resposta.json()["motivo"] == "Anel"
    assert resposta.json()["valor_total"] == "1000.00"
    divida = Divida.objects.get()
    assert divida.credor == "Tia Maria"
    assert divida.motivo == "Anel"
    ids_depois = list(ParcelaDaDivida.objects.order_by("numero").values_list("id"))
    assert ids_depois == ids_antes


def test_patch_com_valor_e_parcelas_novos_regera_as_parcelas(cliente_com_token):
    # Caso 15a-2: 1200 em 4x (antes 1000 em 3x) apaga as 3 parcelas e gera 4 de
    # 300; o valor_total e o total_parcelas da dívida mudam
    divida_id = criar(cliente_com_token).json()["id"]

    resposta = editar(cliente_com_token, divida_id, valor_total="1200.00", parcelas=4)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["valor_total"] == "1200.00"
    assert corpo["total_parcelas"] == 4
    assert [(p["numero"], p["mes"], p["valor"]) for p in corpo["parcelas"]] == [
        (1, "2026-11", "300.00"),
        (2, "2026-12", "300.00"),
        (3, "2027-01", "300.00"),
        (4, "2027-02", "300.00"),
    ]
    divida = Divida.objects.get()
    assert divida.valor_total == 1200
    assert divida.total_parcelas == 4
    assert ParcelaDaDivida.objects.count() == 4


def test_patch_com_mes_novo_regera_os_meses(cliente_com_token):
    # Caso 15a-3: trocar a primeira parcela de novembro para março de 2027 muda
    # os meses das 3 parcelas (os valores continuam os mesmos)
    divida_id = criar(cliente_com_token).json()["id"]

    resposta = editar(cliente_com_token, divida_id, mes_inicio="2027-03")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["mes_inicio"] == "2027-03"
    assert [p["mes"] for p in corpo["parcelas"]] == ["2027-03", "2027-04", "2027-05"]
    assert Divida.objects.get().mes_inicio == date(2027, 3, 1)


def test_patch_com_parcela_paga_recusa_mudar_o_valor(cliente_com_token):
    # Caso 15a-4: com a 1ª parcela paga, mudar o valor responde 400 com a
    # mensagem e nada muda (nem o credor mandado junto, nem as parcelas)
    divida_id = criar(cliente_com_token).json()["id"]
    primeira = ParcelaDaDivida.objects.get(numero=1)
    marcar(cliente_com_token, primeira.id, True)
    ids_antes = list(ParcelaDaDivida.objects.order_by("numero").values_list("id"))

    resposta = editar(
        cliente_com_token, divida_id, credor="Tia Maria", valor_total="2000.00"
    )

    assert resposta.status_code == 400
    assert resposta.json() == {"detail": [COM_PARCELA_PAGA]}
    divida = Divida.objects.get()
    assert divida.credor == "Tia Ana"
    assert divida.valor_total == 1000
    ids_depois = list(ParcelaDaDivida.objects.order_by("numero").values_list("id"))
    assert ids_depois == ids_antes
    primeira.refresh_from_db()
    assert primeira.paga is True


def test_patch_com_parcela_paga_aceita_o_formulario_com_os_mesmos_valores(
    cliente_com_token,
):
    # Caso 15a-5: o app manda o formulário inteiro. Com valor, parcelas e mês
    # iguais aos de antes (não é mudança), só o credor muda e a parcela paga
    # continua paga, com o mesmo id
    divida_id = criar(cliente_com_token).json()["id"]
    primeira = ParcelaDaDivida.objects.get(numero=1)
    marcar(cliente_com_token, primeira.id, True)

    resposta = editar(cliente_com_token, divida_id, **{**JOIA, "credor": "Tia Maria"})

    assert resposta.status_code == 200
    assert resposta.json()["credor"] == "Tia Maria"
    assert resposta.json()["parcelas_pagas"] == 1
    primeira.refresh_from_db()
    assert primeira.paga is True


def test_patch_da_divida_recusa_dados_invalidos(cliente_com_token):
    # Caso 15a-6: as mesmas mensagens do cadastro, e nada muda na dívida
    divida_id = criar(cliente_com_token).json()["id"]
    casos = [
        ({"credor": ""}, {"credor": [SEM_CREDOR]}),
        ({"valor_total": "0.00"}, {"valor_total": [VALOR_INVALIDO]}),
        ({"parcelas": 0}, {"parcelas": [PARCELAS_INVALIDAS]}),
        ({"parcelas": 121}, {"parcelas": [PARCELAS_INVALIDAS]}),
        ({"mes_inicio": "13/2026"}, {"mes_inicio": [MES_INVALIDO]}),
    ]
    for campos, erro in casos:
        resposta = editar(cliente_com_token, divida_id, **campos)

        assert resposta.status_code == 400
        assert resposta.json() == erro
    divida = Divida.objects.get()
    assert divida.credor == "Tia Ana"
    assert divida.valor_total == 1000
    assert divida.total_parcelas == 3
    assert ParcelaDaDivida.objects.count() == 3


def test_resposta_da_divida_traz_mes_inicio(cliente_com_token):
    # Caso 15a-7: GET e PATCH trazem mes_inicio como "AAAA-MM", para o app
    # preencher o campo da edição
    divida_id = criar(cliente_com_token).json()["id"]

    lista = cliente_com_token.get("/api/dividas/").json()
    editada = editar(cliente_com_token, divida_id, motivo="Anel").json()

    assert lista[0]["mes_inicio"] == "2026-11"
    assert editada["mes_inicio"] == "2026-11"


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
