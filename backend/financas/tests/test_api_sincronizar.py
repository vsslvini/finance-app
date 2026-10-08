from datetime import UTC, datetime

import pytest
import requests
from django.utils.dateparse import parse_datetime
from rest_framework.test import APIClient

from financas.models import Conexao


@pytest.fixture
def sincronizar_falso(monkeypatch):
    # Troca o sincronizar() de verdade (que chama a Pluggy pela internet) por um
    # falso. A view chama "sincronizacao.sincronizar()", então a troca é feita no
    # módulo financas.services.sincronizacao. A lista guarda cada chamada feita.
    chamadas = []

    def sincronizar_que_so_anota():
        chamadas.append("chamou")

    monkeypatch.setattr(
        "financas.services.sincronizacao.sincronizar", sincronizar_que_so_anota
    )
    return chamadas


@pytest.mark.django_db
def test_sincronizar_sem_token_responde_401(sincronizar_falso):
    # Caso: sem token, a API recusa com 401 e não chama a Pluggy
    cliente = APIClient()

    resposta = cliente.post("/api/sincronizar/")

    assert resposta.status_code == 401
    assert sincronizar_falso == []


def test_sincronizar_com_get_responde_405(cliente_com_token, sincronizar_falso):
    # Caso: a rota só aceita POST; GET com token recebe 405 e não sincroniza
    resposta = cliente_com_token.get("/api/sincronizar/")

    assert resposta.status_code == 405
    assert sincronizar_falso == []


def test_sincronizar_chama_o_service_e_devolve_a_ultima_atualizacao(
    cliente_com_token, sincronizar_falso
):
    # Caso: com token, chama sincronizar() e devolve a maior ultima_atualizacao
    mais_antiga = datetime(2026, 10, 7, 9, 0, tzinfo=UTC)
    mais_nova = datetime(2026, 10, 8, 12, 30, tzinfo=UTC)
    Conexao.objects.create(
        id_pluggy="item-inter", nome_banco="Inter", ultima_atualizacao=mais_antiga
    )
    Conexao.objects.create(
        id_pluggy="item-nubank", nome_banco="Nubank", ultima_atualizacao=mais_nova
    )

    resposta = cliente_com_token.post("/api/sincronizar/")

    assert resposta.status_code == 200
    assert sincronizar_falso == ["chamou"]
    # parse_datetime lê o texto do JSON de volta como data e hora, para comparar
    # sem depender do jeito exato de escrever o fuso
    assert parse_datetime(resposta.json()["ultima_atualizacao"]) == mais_nova


def test_sincronizar_sem_conexoes_devolve_null(cliente_com_token, sincronizar_falso):
    # Caso: sem nenhuma conexão cadastrada, ultima_atualizacao vem null
    resposta = cliente_com_token.post("/api/sincronizar/")

    assert resposta.status_code == 200
    assert resposta.json() == {"ultima_atualizacao": None}


def test_sincronizar_com_pluggy_fora_responde_502(cliente_com_token, monkeypatch):
    # Caso: a Pluggy falha (erro do requests) e a API responde 502 com mensagem
    def sincronizar_com_erro():
        raise requests.ConnectionError("Sem conexão com a Pluggy")

    monkeypatch.setattr(
        "financas.services.sincronizacao.sincronizar", sincronizar_com_erro
    )

    resposta = cliente_com_token.post("/api/sincronizar/")

    assert resposta.status_code == 502
    assert resposta.json() == {
        "detail": "Não foi possível falar com a Pluggy. Tente de novo mais tarde."
    }
