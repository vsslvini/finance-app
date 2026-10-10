from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from planejamento.models import Configuracao

DIAS_INVALIDOS = "Os dias antes do mês precisam ficar entre 0 e 10."
LIMITE_NEGATIVO = "O limite da fatura não pode ser negativo."


def salvar_configuracao(**campos):
    # Troca só os campos pedidos na configuração (a linha única do app)
    configuracao = Configuracao.atual()
    for campo, valor in campos.items():
        setattr(configuracao, campo, valor)
    configuracao.save()


@pytest.mark.django_db
def test_configuracoes_sem_token_responde_401():
    # Caso: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/configuracoes/")

    assert resposta.status_code == 401


def test_get_sem_nada_salvo_devolve_os_padroes(cliente_com_token):
    # Caso: sem nada salvo, 0 dias antes e sem limite (null no JSON)
    resposta = cliente_com_token.get("/api/configuracoes/")

    assert resposta.status_code == 200
    assert resposta.json() == {"dias_antes_do_mes": 0, "limite_fatura": None}


def test_get_devolve_os_valores_salvos(cliente_com_token):
    # Caso: devolve o que está salvo, com o dinheiro como texto
    salvar_configuracao(dias_antes_do_mes=2, limite_fatura=Decimal("1500.00"))

    resposta = cliente_com_token.get("/api/configuracoes/")

    assert resposta.json() == {"dias_antes_do_mes": 2, "limite_fatura": "1500.00"}


def test_patch_muda_os_dias_antes_e_o_limite(cliente_com_token):
    # Caso: PATCH salva os dois campos e devolve a configuração nova
    resposta = cliente_com_token.patch(
        "/api/configuracoes/",
        {"dias_antes_do_mes": 2, "limite_fatura": "1500.00"},
        format="json",
    )

    assert resposta.status_code == 200
    assert resposta.json() == {"dias_antes_do_mes": 2, "limite_fatura": "1500.00"}
    configuracao = Configuracao.atual()
    assert configuracao.dias_antes_do_mes == 2
    assert configuracao.limite_fatura == Decimal("1500.00")


def test_patch_aceita_limite_null(cliente_com_token):
    # Caso: mandar limite null tira o limite; os dias antes ficam como estavam
    salvar_configuracao(dias_antes_do_mes=3, limite_fatura=Decimal("1500.00"))

    resposta = cliente_com_token.patch(
        "/api/configuracoes/", {"limite_fatura": None}, format="json"
    )

    assert resposta.status_code == 200
    assert resposta.json() == {"dias_antes_do_mes": 3, "limite_fatura": None}
    assert Configuracao.atual().limite_fatura is None


def test_patch_recusa_dias_antes_fora_de_0_a_10(cliente_com_token):
    # Caso: -1 e 11 recebem 400 com mensagem, e nada muda no banco
    for dias in [-1, 11]:
        resposta = cliente_com_token.patch(
            "/api/configuracoes/", {"dias_antes_do_mes": dias}, format="json"
        )

        assert resposta.status_code == 400
        assert resposta.json() == {"dias_antes_do_mes": [DIAS_INVALIDOS]}
    assert Configuracao.atual().dias_antes_do_mes == 0


def test_patch_recusa_limite_negativo(cliente_com_token):
    # Caso: limite -10.00 recebe 400 com mensagem, e o limite salvo não muda
    salvar_configuracao(limite_fatura=Decimal("1500.00"))

    resposta = cliente_com_token.patch(
        "/api/configuracoes/", {"limite_fatura": "-10.00"}, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json() == {"limite_fatura": [LIMITE_NEGATIVO]}
    assert Configuracao.atual().limite_fatura == Decimal("1500.00")


def test_patch_aceita_limite_zero(cliente_com_token):
    # Caso: zero não é negativo, então vale (qualquer fatura acima de 0 avisa)
    resposta = cliente_com_token.patch(
        "/api/configuracoes/", {"limite_fatura": "0.00"}, format="json"
    )

    assert resposta.status_code == 200
    assert resposta.json() == {"dias_antes_do_mes": 0, "limite_fatura": "0.00"}
    assert Configuracao.atual().limite_fatura == Decimal("0.00")
