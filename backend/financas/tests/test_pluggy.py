import pytest
import requests

from financas.integracoes import pluggy

URL = "https://api.pluggy.ai"


class RespostaFalsa:
    # Imita só o que o nosso código usa da resposta do requests
    def __init__(self, dados, status=200):
        self.dados = dados
        self.status_code = status

    def json(self):
        return self.dados

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"Erro {self.status_code}")


def trocar_post(monkeypatch, resposta):
    # Troca o requests.post por uma função que anota cada chamada e não usa internet
    chamadas = []

    def post_falso(url, **argumentos):
        chamadas.append({"url": url, **argumentos})
        return resposta

    monkeypatch.setattr("financas.integracoes.pluggy.requests.post", post_falso)
    return chamadas


def trocar_get(monkeypatch, *respostas):
    # Igual ao trocar_post, mas devolve uma resposta por chamada, na ordem dada
    chamadas = []
    fila = list(respostas)

    def get_falso(url, **argumentos):
        chamadas.append({"url": url, **argumentos})
        return fila.pop(0)

    monkeypatch.setattr("financas.integracoes.pluggy.requests.get", get_falso)
    return chamadas


def test_obter_api_key_manda_credenciais_e_devolve_a_chave(monkeypatch, settings):
    # Caso: pedir a chave manda clientId e clientSecret do settings para /auth
    settings.PLUGGY_CLIENT_ID = "id-falso"
    settings.PLUGGY_CLIENT_SECRET = "segredo-falso"
    chamadas = trocar_post(monkeypatch, RespostaFalsa({"apiKey": "chave-falsa"}))

    api_key = pluggy.obter_api_key()

    assert api_key == "chave-falsa"
    assert len(chamadas) == 1
    assert chamadas[0]["url"] == f"{URL}/auth"
    assert chamadas[0]["json"] == {
        "clientId": "id-falso",
        "clientSecret": "segredo-falso",
    }
    # Sem timeout, uma Pluggy fora do ar travaria a sincronização para sempre
    assert chamadas[0]["timeout"]


def test_obter_api_key_com_credenciais_recusadas_da_erro(monkeypatch, settings):
    # Caso: a Pluggy recusa as credenciais (401) e o erro sobe
    settings.PLUGGY_CLIENT_ID = "id-errado"
    settings.PLUGGY_CLIENT_SECRET = "segredo-errado"
    resposta = RespostaFalsa({"code": 401, "message": "Unauthorized"}, status=401)
    trocar_post(monkeypatch, resposta)

    with pytest.raises(requests.HTTPError):
        pluggy.obter_api_key()


def test_listar_contas_manda_chave_e_item_e_devolve_results(monkeypatch):
    # Caso: listar contas manda o X-API-KEY e o itemId e devolve só o "results"
    resposta = RespostaFalsa(
        {"page": 1, "total": 1, "totalPages": 1, "results": [{"id": "conta-1"}]}
    )
    chamadas = trocar_get(monkeypatch, resposta)

    contas = pluggy.listar_contas("chave-falsa", "item-1")

    assert contas == [{"id": "conta-1"}]
    assert len(chamadas) == 1
    assert chamadas[0]["url"] == f"{URL}/accounts"
    assert chamadas[0]["params"] == {"itemId": "item-1"}
    assert chamadas[0]["headers"]["X-API-KEY"] == "chave-falsa"
    assert chamadas[0]["timeout"]


def test_listar_transacoes_junta_as_duas_paginas(monkeypatch):
    # Caso: transações em duas páginas; a segunda chamada usa o "next" da primeira
    primeira = RespostaFalsa(
        {"results": [{"id": "t1"}], "next": "?accountId=conta-1&after=abc"}
    )
    segunda = RespostaFalsa({"results": [{"id": "t2"}], "next": None})
    chamadas = trocar_get(monkeypatch, primeira, segunda)

    transacoes = pluggy.listar_transacoes("chave-falsa", "conta-1")

    assert transacoes == [{"id": "t1"}, {"id": "t2"}]
    assert len(chamadas) == 2
    assert chamadas[0]["url"] == f"{URL}/v2/transactions"
    assert chamadas[0]["params"] == {"accountId": "conta-1"}
    # O "next" já traz o accountId, então a segunda chamada vai sem params
    assert chamadas[1]["url"] == f"{URL}/v2/transactions?accountId=conta-1&after=abc"
    assert chamadas[1].get("params") is None
    assert chamadas[0]["headers"]["X-API-KEY"] == "chave-falsa"
    assert chamadas[1]["headers"]["X-API-KEY"] == "chave-falsa"


def test_listar_transacoes_com_uma_pagina_so(monkeypatch):
    # Caso: "next" nulo logo na primeira página, então é uma chamada só
    resposta = RespostaFalsa({"results": [{"id": "t1"}], "next": None})
    chamadas = trocar_get(monkeypatch, resposta)

    transacoes = pluggy.listar_transacoes("chave-falsa", "conta-1")

    assert transacoes == [{"id": "t1"}]
    assert len(chamadas) == 1
