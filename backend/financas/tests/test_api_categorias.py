import pytest
from rest_framework.test import APIClient

from financas.models import Categoria


@pytest.mark.django_db
def test_categorias_sem_token_responde_401():
    # Caso 7 do Módulo 8: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/categorias/")

    assert resposta.status_code == 401


def test_categorias_lista_so_as_que_nao_sao_pai(cliente_com_token):
    # Caso 7 do Módulo 8: "Food and drinks" é pai de outras (um grupo) e fica de
    # fora; entram as filhas e as que não têm filhas (como "Groceries"), com o
    # nome em português ou, sem tradução, em inglês, em ordem alfabética do nome
    Categoria.objects.create(
        id_pluggy="09000000", descricao="Food and drinks", descricao_pt="Comida"
    )
    Categoria.objects.create(
        id_pluggy="09010000",
        descricao="Eating out",
        descricao_pt="Restaurantes",
        id_pai="09000000",
    )
    Categoria.objects.create(
        id_pluggy="09020000",
        descricao="Food delivery",
        descricao_pt="Delivery",
        id_pai="09000000",
    )
    Categoria.objects.create(
        id_pluggy="08000000", descricao="Groceries", descricao_pt="Mercado"
    )
    Categoria.objects.create(id_pluggy="19000000", descricao="Leisure")

    resposta = cliente_com_token.get("/api/categorias/")

    assert resposta.status_code == 200
    assert resposta.json() == [
        {"descricao": "Food delivery", "nome": "Delivery"},
        {"descricao": "Leisure", "nome": "Leisure"},
        {"descricao": "Groceries", "nome": "Mercado"},
        {"descricao": "Eating out", "nome": "Restaurantes"},
    ]
