import requests
from django.conf import settings

URL = "https://api.pluggy.ai"
# Segundos de espera por resposta; sem isso, uma Pluggy fora do ar travaria tudo
TIMEOUT = 30


def cabecalho(api_key):
    return {"X-API-KEY": api_key}


def obter_api_key():
    # settings lido aqui dentro (e não no topo) para valer o valor atual
    credenciais = {
        "clientId": settings.PLUGGY_CLIENT_ID,
        "clientSecret": settings.PLUGGY_CLIENT_SECRET,
    }
    resposta = requests.post(f"{URL}/auth", json=credenciais, timeout=TIMEOUT)
    resposta.raise_for_status()
    return resposta.json()["apiKey"]


def listar_contas(api_key, item_id):
    resposta = requests.get(
        f"{URL}/accounts",
        params={"itemId": item_id},
        headers=cabecalho(api_key),
        timeout=TIMEOUT,
    )
    resposta.raise_for_status()
    return resposta.json()["results"]


def listar_transacoes(api_key, conta_id):
    resposta = requests.get(
        f"{URL}/v2/transactions",
        params={"accountId": conta_id},
        headers=cabecalho(api_key),
        timeout=TIMEOUT,
    )
    resposta.raise_for_status()
    dados = resposta.json()
    transacoes = dados["results"]

    # O "next" já vem pronto (ex.: "?accountId=...&after=..."), por isso sem params
    while dados.get("next"):
        resposta = requests.get(
            URL + "/v2/transactions" + dados["next"],
            headers=cabecalho(api_key),
            timeout=TIMEOUT,
        )
        resposta.raise_for_status()
        dados = resposta.json()
        transacoes.extend(dados["results"])

    return transacoes


def listar_investimentos(api_key, item_id):
    # Aqui a paginação é por número de página (page e totalPages), e não pelo
    # "next" das transações; sem resultados, totalPages vem 0 e o laço para
    investimentos = []
    pagina = 1
    total_de_paginas = 1
    while pagina <= total_de_paginas:
        resposta = requests.get(
            f"{URL}/investments",
            params={"itemId": item_id, "page": pagina},
            headers=cabecalho(api_key),
            timeout=TIMEOUT,
        )
        resposta.raise_for_status()
        dados = resposta.json()
        investimentos.extend(dados["results"])
        total_de_paginas = dados["totalPages"]
        pagina += 1

    return investimentos


def listar_categorias(api_key):
    # A árvore de categorias é a mesma para todas as conexões (sem itemId).
    # Mesma paginação por número de página dos investimentos
    categorias = []
    pagina = 1
    total_de_paginas = 1
    while pagina <= total_de_paginas:
        resposta = requests.get(
            f"{URL}/categories",
            params={"page": pagina},
            headers=cabecalho(api_key),
            timeout=TIMEOUT,
        )
        resposta.raise_for_status()
        dados = resposta.json()
        categorias.extend(dados["results"])
        total_de_paginas = dados["totalPages"]
        pagina += 1

    return categorias
