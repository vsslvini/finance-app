import pytest
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

# Mesma fixture de financas/tests/conftest.py: um conftest.py só vale para a
# própria pasta (e subpastas), então este app precisa do seu


@pytest.fixture
def cliente_com_token(db):
    # Cliente que já manda "Authorization: Token <chave>" em toda requisição
    usuario = User.objects.create_user(username="vinicius", password="senha-teste")
    token = Token.objects.create(user=usuario)
    cliente = APIClient()
    cliente.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente
