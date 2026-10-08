from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from financas.models import Conexao, Conta, Transacao

MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-10."


@pytest.mark.django_db
def test_resumo_sem_token_responde_401():
    # Caso: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/resumo/")

    assert resposta.status_code == 401


def test_resumo_traz_as_chaves_e_dinheiro_como_texto(cliente_com_token):
    # Caso: 200 com exatamente as chaves combinadas, dinheiro como texto e os
    # últimos gastos no mesmo formato da rota de transações
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    conta = Conta.objects.create(
        conexao=conexao, tipo="corrente", nome="Conta Nubank", saldo=Decimal(1000)
    )
    # Data de hoje, para o teste não depender do dia em que roda
    hoje = timezone.localdate()
    gasto = Transacao.objects.create(
        conta=conta,
        data=hoje,
        descricao="Mercado",
        valor=Decimal("-50.00"),
        categoria_pluggy="Supermercado",
    )

    resposta = cliente_com_token.get("/api/resumo/")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert set(dados) == {
        "saldo_total",
        "fatura_aberta",
        "entradas",
        "saidas",
        "posso_gastar_por_dia",
        "ultimos_gastos",
    }
    assert dados["saldo_total"] == "1000.00"
    assert dados["fatura_aberta"] == "0.00"
    assert dados["entradas"] == "0.00"
    assert dados["saidas"] == "50.00"
    # O valor muda com o dia; aqui importa só que venha como texto
    assert isinstance(dados["posso_gastar_por_dia"], str)
    assert dados["ultimos_gastos"] == [
        {
            "id": gasto.id,
            "data": hoje.isoformat(),
            "descricao": "Mercado",
            "valor": "-50.00",
            "conta": conta.id,
            "nome_conta": "Conta Nubank",
            "nome_banco": "Nubank",
            "categoria": "Supermercado",
            "parcela_atual": None,
            "total_parcelas": None,
        }
    ]


def test_resumo_mes_invalido_responde_400_com_mensagem(cliente_com_token):
    # Caso: mês 13 ou texto qualquer recebe 400 com a mesma mensagem das transações
    for mes in ["2026-13", "abc"]:
        resposta = cliente_com_token.get(f"/api/resumo/?mes={mes}")

        assert resposta.status_code == 400
        assert resposta.json() == {"detail": MES_INVALIDO}
