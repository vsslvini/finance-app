import pytest
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

# O pytest lê este arquivo sozinho: as fixtures daqui valem para todos os
# arquivos de teste desta pasta, sem precisar de import


@pytest.fixture
def cliente_com_token(db):
    # Cliente que já manda "Authorization: Token <chave>" em toda requisição
    usuario = User.objects.create_user(username="vinicius", password="senha-teste")
    token = Token.objects.create(user=usuario)
    cliente = APIClient()
    cliente.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente
