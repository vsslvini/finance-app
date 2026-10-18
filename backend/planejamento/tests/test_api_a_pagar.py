from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from planejamento.models import Configuracao, GastoFixo
from planejamento.services.dividas import criar_divida

OUTUBRO = date(2026, 10, 1)


@pytest.fixture(autouse=True)
def hoje_18_de_outubro(monkeypatch):
    # A view pergunta o dia com timezone.localdate() para saber o mês atual do
    # app; fixando outubro de 2026, o teste não muda com o dia em que roda
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 10, 18))


@pytest.mark.django_db
def test_a_pagar_sem_token_responde_401():
    # Caso 11: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/a-pagar/")

    assert resposta.status_code == 401


def test_sem_nada_cadastrado_devolve_6_meses_em_texto(cliente_com_token):
    # Caso 1: o formato da resposta: mês "AAAA-MM", dinheiro como texto com 2
    # casas (não número) e percentuais nulos, porque não há renda. Caso 3
    # (18a): o JSON exato inclui percentual_fixos e percentual_dividas
    resposta = cliente_com_token.get("/api/a-pagar/")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["renda_mensal"] is None
    assert [mes["mes"] for mes in dados["meses"]] == [
        "2026-10",
        "2026-11",
        "2026-12",
        "2027-01",
        "2027-02",
        "2027-03",
    ]
    assert dados["meses"][0] == {
        "mes": "2026-10",
        "fixos": "0.00",
        "dividas": "0.00",
        "total": "0.00",
        "falta": "0.00",
        "percentual_da_renda": None,
        "percentual_fixos": None,
        "percentual_dividas": None,
    }


def test_com_renda_devolve_o_percentual_com_uma_casa(cliente_com_token):
    # Caso 7: renda 5000 e total 1933.73 (1600.40 de fixos + parcela de
    # 333.33) dão 38.7%; a renda volta como texto
    Configuracao.objects.update_or_create(
        pk=1, defaults={"renda_mensal": Decimal("5000.00")}
    )
    GastoFixo.objects.create(
        nome="Aluguel", valor=Decimal("1600.40"), mes_inicio=OUTUBRO
    )
    criar_divida("Fulano", "", Decimal("1000.00"), 3, OUTUBRO)

    resposta = cliente_com_token.get("/api/a-pagar/")

    dados = resposta.json()
    assert dados["renda_mensal"] == "5000.00"
    assert dados["meses"][0] == {
        "mes": "2026-10",
        "fixos": "1600.40",
        "dividas": "333.33",
        "total": "1933.73",
        "falta": "1933.73",
        "percentual_da_renda": "38.7",
        "percentual_fixos": "32.0",
        "percentual_dividas": "6.7",
    }


def test_percentuais_de_fixos_e_dividas_separados(cliente_com_token):
    # Caso 1 (18a): renda 5000, fixos 1200 e dívidas 333.33 no mês: os fixos
    # tiram 24.0%, as dívidas 6.7% (6,67 arredondado) e o total 30.7%
    Configuracao.objects.update_or_create(
        pk=1, defaults={"renda_mensal": Decimal("5000.00")}
    )
    GastoFixo.objects.create(
        nome="Aluguel", valor=Decimal("1200.00"), mes_inicio=OUTUBRO
    )
    criar_divida("Fulano", "", Decimal("1000.00"), 3, OUTUBRO)

    mes = cliente_com_token.get("/api/a-pagar/").json()["meses"][0]

    assert mes["percentual_fixos"] == "24.0"
    assert mes["percentual_dividas"] == "6.7"
    assert mes["percentual_da_renda"] == "30.7"


def test_sem_renda_os_tres_percentuais_sao_nulos(cliente_com_token):
    # Caso 2 (18a): sem renda não dá para dividir; os três saem null, mesmo
    # com valores a pagar no mês
    GastoFixo.objects.create(
        nome="Aluguel", valor=Decimal("1200.00"), mes_inicio=OUTUBRO
    )
    criar_divida("Fulano", "", Decimal("1000.00"), 3, OUTUBRO)

    mes = cliente_com_token.get("/api/a-pagar/").json()["meses"][0]

    assert mes["percentual_fixos"] is None
    assert mes["percentual_dividas"] is None
    assert mes["percentual_da_renda"] is None


def test_dias_antes_do_mes_mudam_o_primeiro_mes(cliente_com_token, monkeypatch):
    # Caso 8: a rota lê os dias antes das configurações; no dia 30/10 com 2
    # dias, o primeiro mês é novembro
    monkeypatch.setattr(timezone, "localdate", lambda: date(2026, 10, 30))
    Configuracao.objects.update_or_create(pk=1, defaults={"dias_antes_do_mes": 2})

    resposta = cliente_com_token.get("/api/a-pagar/")

    assert resposta.json()["meses"][0]["mes"] == "2026-11"
