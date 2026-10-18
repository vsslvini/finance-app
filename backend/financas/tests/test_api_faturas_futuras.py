from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from financas.models import Conexao, Conta, Transacao
from planejamento.models import Configuracao


def fixar_hoje(monkeypatch, dia):
    # A view pergunta o dia com timezone.localdate(); trocando essa função, a
    # view enxerga o dia que o teste quer. O monkeypatch desfaz a troca no fim
    monkeypatch.setattr(timezone, "localdate", lambda: dia)


@pytest.mark.django_db
def test_faturas_futuras_sem_token_responde_401():
    # Caso 8: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/faturas-futuras/")

    assert resposta.status_code == 401


def test_faturas_futuras_traz_o_formato_e_dinheiro_como_texto(
    cliente_com_token, monkeypatch
):
    # Caso 8: hoje 15/10/2026, sem dias antes, uma compra 2/6 de 245,30 no
    # cartão em outubro. Vêm 6 meses (novembro a abril); novembro com o cartão
    # e o dinheiro como texto; abril sem parcela, com "0.00" e lista vazia
    fixar_hoje(monkeypatch, date(2026, 10, 15))
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    gold = Conta.objects.create(
        conexao=conexao, tipo="cartao", nome="gold", saldo=Decimal("0.00")
    )
    Transacao.objects.create(
        conta=gold,
        data=date(2026, 10, 10),
        descricao="LOJA X 2/6",
        valor=Decimal("-245.30"),
        parcela_atual=2,
        total_parcelas=6,
    )

    resposta = cliente_com_token.get("/api/faturas-futuras/")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert set(dados) == {"meses"}
    assert len(dados["meses"]) == 6
    assert dados["meses"][0] == {
        "mes": "2026-11",
        "total": "245.30",
        "cartoes": [
            {
                "conta": gold.id,
                "nome_banco": "Nubank",
                "nome_conta": "gold",
                "total": "245.30",
            }
        ],
    }
    assert dados["meses"][5] == {"mes": "2027-04", "total": "0.00", "cartoes": []}


def test_faturas_futuras_usa_os_dias_antes_da_configuracao(
    cliente_com_token, monkeypatch
):
    # Caso 7: com 2 dias antes salvos, em 30/10 o mês do app é novembro, então
    # a lista começa em dezembro
    configuracao = Configuracao.atual()
    configuracao.dias_antes_do_mes = 2
    configuracao.save()
    fixar_hoje(monkeypatch, date(2026, 10, 30))

    dados = cliente_com_token.get("/api/faturas-futuras/").json()

    assert dados["meses"][0]["mes"] == "2026-12"
    assert dados["meses"][5]["mes"] == "2027-05"
