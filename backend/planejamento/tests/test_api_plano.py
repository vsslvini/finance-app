from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from planejamento.models import Configuracao, PlanoDeGuardar

VALOR_NEGATIVO = "O valor por mês não pode ser negativo."
MES_ALVO_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2027-07."
MES_ALVO_NO_PASSADO = "O mês alvo não pode ser antes do mês atual."
PLANO_INCOMPLETO = "Preencha o valor por mês e o mês alvo, ou deixe os dois vazios."
SEM_PLANO = {"valor_mensal": None, "mes_alvo": None}


@pytest.fixture
def hoje_10_de_outubro(monkeypatch):
    # A view pergunta o dia com timezone.localdate(); trocando essa função, o
    # "mês atual" fica outubro de 2026 em todos os testes, seja qual for o dia
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 10, 10))


def salvar_plano(valor_mensal, mes_alvo):
    plano = PlanoDeGuardar.atual()
    plano.valor_mensal = valor_mensal
    plano.mes_alvo = mes_alvo
    plano.save()


def patch_plano(cliente, dados):
    return cliente.patch("/api/plano/", dados, format="json")


@pytest.mark.django_db
def test_plano_sem_token_responde_401():
    # Caso 8: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/plano/")

    assert resposta.status_code == 401


def test_get_sem_plano_devolve_os_dois_null(cliente_com_token):
    # Caso 8: sem nada salvo, os dois campos vêm null
    resposta = cliente_com_token.get("/api/plano/")

    assert resposta.status_code == 200
    assert resposta.json() == SEM_PLANO


def test_get_devolve_o_mes_como_aaaa_mm(cliente_com_token):
    # Caso 8: no banco é 01/07/2027; na API sai só o mês, "2027-07"
    salvar_plano(Decimal("500.00"), date(2027, 7, 1))

    resposta = cliente_com_token.get("/api/plano/")

    assert resposta.json() == {"valor_mensal": "500.00", "mes_alvo": "2027-07"}


def test_patch_salva_valor_e_mes(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: o PATCH salva os dois e devolve o plano novo; o mês vira o dia 1
    resposta = patch_plano(
        cliente_com_token, {"valor_mensal": "500.00", "mes_alvo": "2027-07"}
    )

    assert resposta.status_code == 200
    assert resposta.json() == {"valor_mensal": "500.00", "mes_alvo": "2027-07"}
    plano = PlanoDeGuardar.atual()
    assert plano.valor_mensal == Decimal("500.00")
    assert plano.mes_alvo == date(2027, 7, 1)


def test_patch_com_os_dois_null_remove_o_plano(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: mandar os dois null tira o plano
    salvar_plano(Decimal("500.00"), date(2027, 7, 1))

    resposta = patch_plano(cliente_com_token, SEM_PLANO)

    assert resposta.status_code == 200
    assert resposta.json() == SEM_PLANO
    plano = PlanoDeGuardar.atual()
    assert plano.valor_mensal is None
    assert plano.mes_alvo is None


def test_patch_so_do_valor_mantem_o_mes(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: com plano salvo, mudar só o valor mantém o mês alvo
    salvar_plano(Decimal("500.00"), date(2027, 7, 1))

    resposta = patch_plano(cliente_com_token, {"valor_mensal": "600.00"})

    assert resposta.status_code == 200
    assert resposta.json() == {"valor_mensal": "600.00", "mes_alvo": "2027-07"}


def test_patch_recusa_valor_negativo(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: valor -10.00 recebe 400 com mensagem, e nada é salvo
    resposta = patch_plano(
        cliente_com_token, {"valor_mensal": "-10.00", "mes_alvo": "2027-07"}
    )

    assert resposta.status_code == 400
    assert resposta.json() == {"valor_mensal": [VALOR_NEGATIVO]}
    assert PlanoDeGuardar.atual().valor_mensal is None


def test_patch_recusa_mes_no_passado(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: hoje em outubro de 2026, setembro de 2026 já passou: 400 com
    # mensagem, e nada é salvo
    resposta = patch_plano(
        cliente_com_token, {"valor_mensal": "500.00", "mes_alvo": "2026-09"}
    )

    assert resposta.status_code == 400
    assert resposta.json() == {"mes_alvo": [MES_ALVO_NO_PASSADO]}
    assert PlanoDeGuardar.atual().mes_alvo is None


def test_patch_aceita_o_mes_atual(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: o próprio mês atual (outubro de 2026) ainda vale como alvo
    resposta = patch_plano(
        cliente_com_token, {"valor_mensal": "500.00", "mes_alvo": "2026-10"}
    )

    assert resposta.status_code == 200
    assert PlanoDeGuardar.atual().mes_alvo == date(2026, 10, 1)


def test_mes_atual_e_o_mes_do_app(cliente_com_token, monkeypatch):
    # Caso 8: com 2 dias antes, em 30/10/2026 o mês do app já é novembro, então
    # outubro passa a ser mês no passado
    configuracao = Configuracao.atual()
    configuracao.dias_antes_do_mes = 2
    configuracao.save()
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 10, 30))

    resposta = patch_plano(
        cliente_com_token, {"valor_mensal": "500.00", "mes_alvo": "2026-10"}
    )

    assert resposta.status_code == 400
    assert resposta.json() == {"mes_alvo": [MES_ALVO_NO_PASSADO]}


def test_patch_recusa_so_um_dos_dois(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: sem plano salvo, mandar só o valor (ou só o mês) não forma um
    # plano: 400 com mensagem, e nada é salvo
    for dados in [{"valor_mensal": "500.00"}, {"mes_alvo": "2027-07"}]:
        resposta = patch_plano(cliente_com_token, dados)

        assert resposta.status_code == 400
        assert resposta.json() == {"non_field_errors": [PLANO_INCOMPLETO]}
    plano = PlanoDeGuardar.atual()
    assert plano.valor_mensal is None
    assert plano.mes_alvo is None


def test_patch_recusa_esvaziar_so_um_dos_dois(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: com plano salvo, apagar só o valor deixaria o plano pela metade
    salvar_plano(Decimal("500.00"), date(2027, 7, 1))

    resposta = patch_plano(cliente_com_token, {"valor_mensal": None})

    assert resposta.status_code == 400
    assert resposta.json() == {"non_field_errors": [PLANO_INCOMPLETO]}
    assert PlanoDeGuardar.atual().valor_mensal == Decimal("500.00")


def test_patch_recusa_mes_em_formato_errado(cliente_com_token, hoje_10_de_outubro):
    # Caso 8: "07/2027" e "2027-07-15" não são "AAAA-MM": 400 com mensagem
    for mes in ["07/2027", "2027-07-15"]:
        resposta = patch_plano(
            cliente_com_token, {"valor_mensal": "500.00", "mes_alvo": mes}
        )

        assert resposta.status_code == 400
        assert resposta.json() == {"mes_alvo": [MES_ALVO_INVALIDO]}
