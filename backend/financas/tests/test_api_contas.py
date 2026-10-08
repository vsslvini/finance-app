from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from financas.models import Conexao, Conta


@pytest.fixture
def nubank(db):
    return Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")


def criar_conta(conexao, **campos):
    # Conta corrente com valores padrão; cada teste troca só o que importa
    dados = {
        "tipo": "corrente",
        "nome": "Conta Nubank",
        "saldo": Decimal("100.00"),
    }
    dados.update(campos)
    return Conta.objects.create(conexao=conexao, **dados)


@pytest.mark.django_db
def test_contas_sem_token_responde_401():
    # Caso: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/contas/")

    assert resposta.status_code == 401


@pytest.mark.django_db
def test_contas_com_token_inventado_responde_401():
    # Caso: token que não existe no banco também é recusado com 401
    cliente = APIClient()
    cliente.credentials(HTTP_AUTHORIZATION="Token token-inventado")

    resposta = cliente.get("/api/contas/")

    assert resposta.status_code == 401


def test_contas_com_token_valido_responde_200(cliente_com_token):
    # Caso: usuário com token válido recebe 200
    resposta = cliente_com_token.get("/api/contas/")

    assert resposta.status_code == 200


def test_contas_banco_vazio_devolve_lista_vazia(cliente_com_token):
    # Caso: sem nenhuma conta no banco, a resposta é []
    resposta = cliente_com_token.get("/api/contas/")

    assert resposta.json() == []


def test_conta_corrente_traz_os_campos_e_nulos_do_cartao(cliente_com_token, nubank):
    # Caso: conta corrente traz id, nome, banco, tipo e saldo; campos de cartão null
    conta = criar_conta(nubank, saldo=Decimal("1500.50"))

    resposta = cliente_com_token.get("/api/contas/")

    assert resposta.json() == [
        {
            "id": conta.id,
            "nome": "Conta Nubank",
            "nome_banco": "Nubank",
            "tipo": "corrente",
            "saldo": "1500.50",
            "limite_total": None,
            "limite_disponivel": None,
            "data_fechamento": None,
            "data_vencimento": None,
        }
    ]


def test_cartao_traz_limites_e_datas(cliente_com_token, nubank):
    # Caso: cartão traz limites e datas; sem data de fechamento vem null, sem erro
    criar_conta(
        nubank,
        tipo="cartao",
        nome="Black",
        saldo=Decimal("850.25"),
        limite_total=Decimal("5000.00"),
        limite_disponivel=Decimal("4149.75"),
        data_fechamento=date(2026, 10, 20),
        data_vencimento=date(2026, 10, 27),
    )
    criar_conta(
        nubank,
        tipo="cartao",
        nome="Roxinho",
        saldo=Decimal("0.00"),
        limite_total=Decimal("1000.00"),
        limite_disponivel=Decimal("1000.00"),
        data_vencimento=date(2026, 10, 15),
    )

    resposta = cliente_com_token.get("/api/contas/")

    black, roxinho = resposta.json()
    assert black["tipo"] == "cartao"
    assert black["limite_total"] == "5000.00"
    assert black["limite_disponivel"] == "4149.75"
    assert black["data_fechamento"] == "2026-10-20"
    assert black["data_vencimento"] == "2026-10-27"
    assert roxinho["data_fechamento"] is None
    assert roxinho["data_vencimento"] == "2026-10-15"


def test_saldo_volta_como_texto(cliente_com_token, nubank):
    # Caso: saldo 1234.56 volta como o texto "1234.56" (texto não perde centavos)
    criar_conta(nubank, saldo=Decimal("1234.56"))

    resposta = cliente_com_token.get("/api/contas/")

    assert resposta.json()[0]["saldo"] == "1234.56"


def test_contas_ordenadas_por_banco_e_depois_por_nome(cliente_com_token, nubank):
    # Caso: a lista vem por nome do banco e, no mesmo banco, por nome da conta
    inter = Conexao.objects.create(id_pluggy="item-inter", nome_banco="Inter")
    # Criadas fora de ordem, para o teste não passar só pela ordem de criação
    criar_conta(nubank, nome="Conta Nubank")
    criar_conta(inter, nome="Conta Inter")
    criar_conta(inter, nome="Cartão Inter", tipo="cartao")

    resposta = cliente_com_token.get("/api/contas/")

    nomes = [(conta["nome_banco"], conta["nome"]) for conta in resposta.json()]
    assert nomes == [
        ("Inter", "Cartão Inter"),
        ("Inter", "Conta Inter"),
        ("Nubank", "Conta Nubank"),
    ]


def test_id_pluggy_nao_aparece_na_resposta(cliente_com_token, nubank):
    # Caso: o id da Pluggy é interno do backend e não vai para o app
    criar_conta(nubank, id_pluggy="conta-corrente")

    resposta = cliente_com_token.get("/api/contas/")

    assert "id_pluggy" not in resposta.json()[0]
