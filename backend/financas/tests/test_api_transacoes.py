from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from financas.models import Conexao, Conta, Transacao

MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-10."


@pytest.fixture
def conta(db):
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    return Conta.objects.create(
        conexao=conexao,
        tipo="corrente",
        nome="Conta Nubank",
        saldo=Decimal("100.00"),
    )


def criar_transacao(conta, **campos):
    # Transação com valores padrão; cada teste troca só o que importa
    dados = {
        "data": date(2026, 10, 5),
        "descricao": "Padaria",
        "valor": Decimal("-10.00"),
    }
    dados.update(campos)
    return Transacao.objects.create(conta=conta, **dados)


@pytest.mark.django_db
def test_transacoes_sem_token_responde_401():
    # Caso: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/transacoes/?mes=2026-10")

    assert resposta.status_code == 401


def test_filtra_so_o_mes_pedido(cliente_com_token, conta):
    # Caso: ?mes=2026-10 traz só outubro; 30/09 e 01/11 ficam de fora
    criar_transacao(conta, data=date(2026, 9, 30), descricao="Fim de setembro")
    criar_transacao(conta, data=date(2026, 10, 1), descricao="Começo de outubro")
    criar_transacao(conta, data=date(2026, 10, 31), descricao="Fim de outubro")
    criar_transacao(conta, data=date(2026, 11, 1), descricao="Começo de novembro")

    resposta = cliente_com_token.get("/api/transacoes/?mes=2026-10")

    assert resposta.status_code == 200
    descricoes = {transacao["descricao"] for transacao in resposta.json()}
    assert descricoes == {"Começo de outubro", "Fim de outubro"}


def test_sem_mes_usa_o_mes_atual(cliente_com_token, conta):
    # Caso: sem ?mes=, a API devolve as transações do mês de hoje
    criar_transacao(conta, data=timezone.localdate(), descricao="Hoje")
    # Uma data bem longe de hoje, para nunca cair no mesmo mês
    criar_transacao(conta, data=date(2000, 1, 15), descricao="Ano 2000")

    resposta = cliente_com_token.get("/api/transacoes/")

    descricoes = [transacao["descricao"] for transacao in resposta.json()]
    assert descricoes == ["Hoje"]


def test_mes_invalido_responde_400_com_mensagem(cliente_com_token):
    # Caso: mês 13 ou texto qualquer recebe 400 com uma mensagem clara
    for mes in ["2026-13", "abc"]:
        resposta = cliente_com_token.get(f"/api/transacoes/?mes={mes}")

        assert resposta.status_code == 400
        assert resposta.json() == {"detail": MES_INVALIDO}


def test_transacao_traz_os_campos_combinados(cliente_com_token, conta):
    # Caso: cada transação traz exatamente os campos que o app vai usar
    transacao = criar_transacao(
        conta,
        descricao="Geladeira",
        valor=Decimal("-350.90"),
        categoria_pluggy="Eletrodomésticos",
        parcela_atual=3,
        total_parcelas=10,
    )

    resposta = cliente_com_token.get("/api/transacoes/?mes=2026-10")

    assert resposta.json() == [
        {
            "id": transacao.id,
            "data": "2026-10-05",
            "descricao": "Geladeira",
            "valor": "-350.90",
            "conta": conta.id,
            "nome_conta": "Conta Nubank",
            "nome_banco": "Nubank",
            "categoria": "Eletrodomésticos",
            "parcela_atual": 3,
            "total_parcelas": 10,
        }
    ]


def test_categoria_manual_vence_a_da_pluggy(cliente_com_token, conta):
    # Caso: com categoria manual e da Pluggy, a resposta mostra a manual
    criar_transacao(conta, categoria_pluggy="Alimentação", categoria_manual="Mercado")

    resposta = cliente_com_token.get("/api/transacoes/?mes=2026-10")

    assert resposta.json()[0]["categoria"] == "Mercado"


def test_categoria_usa_a_da_pluggy_sem_manual(cliente_com_token, conta):
    # Caso: sem categoria manual, a resposta mostra a da Pluggy
    criar_transacao(conta, categoria_pluggy="Alimentação")

    resposta = cliente_com_token.get("/api/transacoes/?mes=2026-10")

    assert resposta.json()[0]["categoria"] == "Alimentação"


def test_sem_nenhuma_categoria_vem_sem_categoria(cliente_com_token, conta):
    # Caso: sem categoria manual nem da Pluggy, a resposta mostra "Sem categoria"
    criar_transacao(conta)

    resposta = cliente_com_token.get("/api/transacoes/?mes=2026-10")

    assert resposta.json()[0]["categoria"] == "Sem categoria"


def test_transacoes_mais_novas_primeiro(cliente_com_token, conta):
    # Caso: ordem por data, da mais nova para a mais antiga; no mesmo dia, a de
    # id maior (criada depois) vem antes
    dia_5_primeira = criar_transacao(conta, data=date(2026, 10, 5))
    dia_10 = criar_transacao(conta, data=date(2026, 10, 10))
    dia_5_segunda = criar_transacao(conta, data=date(2026, 10, 5))

    resposta = cliente_com_token.get("/api/transacoes/?mes=2026-10")

    ids = [transacao["id"] for transacao in resposta.json()]
    assert ids == [dia_10.id, dia_5_segunda.id, dia_5_primeira.id]
