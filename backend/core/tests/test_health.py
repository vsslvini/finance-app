from rest_framework.test import APIClient


def test_health_responde_status_200_e_ok():
    # Caso: quando eu acesso /api/health/, recebo status 200 e a resposta {"status": "ok"}
    cliente = APIClient()

    resposta = cliente.get("/api/health/")

    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}
