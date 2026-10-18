from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from financas.models import Categoria, Conexao, Conta, Transacao
from planejamento.models import Configuracao, Divida, GastoFixo, ParcelaDaDivida

MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-10."


@pytest.fixture
def conta(db):
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    return Conta.objects.create(
        conexao=conexao, tipo="corrente", nome="Conta Nubank", saldo=Decimal(0)
    )


def salvar_dias_antes(dias):
    configuracao = Configuracao.atual()
    configuracao.dias_antes_do_mes = dias
    configuracao.save()


def fixar_hoje(monkeypatch, dia):
    # A view pergunta o dia com timezone.localdate(); o monkeypatch troca essa
    # função pelo dia que o teste quer e desfaz a troca no fim
    monkeypatch.setattr(timezone, "localdate", lambda: dia)


@pytest.mark.django_db
def test_relatorio_sem_token_responde_401():
    # Caso 7: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/relatorio/")

    assert resposta.status_code == 401


def test_relatorio_traz_as_chaves_dinheiro_como_texto_e_traducao(
    cliente_com_token, conta
):
    # Casos 4 e 5: 200 com as chaves combinadas, dinheiro como texto, a
    # categoria traduzida e os maiores gastos no formato da lista de transações
    Categoria.objects.create(
        id_pluggy="08000000", descricao="Groceries", descricao_pt="Mercado"
    )
    Transacao.objects.create(
        conta=conta,
        data=date(2026, 10, 1),
        descricao="Salário",
        valor=Decimal("3000.00"),
    )
    gasto = Transacao.objects.create(
        conta=conta,
        data=date(2026, 10, 5),
        descricao="Mercado do bairro",
        valor=Decimal("-50.00"),
        categoria_pluggy="Groceries",
    )

    resposta = cliente_com_token.get("/api/relatorio/?mes=2026-10")

    assert resposta.status_code == 200
    assert resposta.json() == {
        "mes": "2026-10",
        "entradas": "3000.00",
        "saidas": "50.00",
        "saldo_do_mes": "2950.00",
        "total_gastos": "50.00",
        "gastos_por_categoria": [
            {
                "categoria": "Mercado",
                "categoria_original": "Groceries",
                "total": "50.00",
                "porcentagem": 100,
            }
        ],
        "maiores_gastos": [
            {
                "id": gasto.id,
                "data": "2026-10-05",
                "descricao": "Mercado do bairro",
                "valor": "-50.00",
                "conta": conta.id,
                "nome_conta": "Conta Nubank",
                "nome_banco": "Nubank",
                "categoria": "Mercado",
                "categoria_original": "Groceries",
                "parcela_atual": None,
                "total_parcelas": None,
            }
        ],
    }


def test_relatorio_sem_mes_usa_o_mes_do_app(cliente_com_token, conta, monkeypatch):
    # Caso 6: 2 dias antes e hoje 30/10/2026: sem ?mes=, já é novembro (de 30/10
    # a 28/11), então o gasto de 30/10 entra e o de 29/10 fica em outubro
    salvar_dias_antes(2)
    fixar_hoje(monkeypatch, date(2026, 10, 30))
    for dia in [29, 30]:
        Transacao.objects.create(
            conta=conta,
            data=date(2026, 10, dia),
            descricao=f"Dia {dia}",
            valor=Decimal(f"-{dia}.00"),
        )

    novembro = cliente_com_token.get("/api/relatorio/").json()
    outubro = cliente_com_token.get("/api/relatorio/?mes=2026-10").json()

    assert novembro["mes"] == "2026-11"
    assert novembro["total_gastos"] == "30.00"
    assert outubro["mes"] == "2026-10"
    assert outubro["total_gastos"] == "29.00"


def test_relatorio_sem_gastos_traz_zeros_e_listas_vazias(cliente_com_token):
    # Caso 6: sem nada no mês, tudo "0.00" e listas vazias, sem erro
    resposta = cliente_com_token.get("/api/relatorio/?mes=2026-10")

    assert resposta.status_code == 200
    assert resposta.json() == {
        "mes": "2026-10",
        "entradas": "0.00",
        "saidas": "0.00",
        "saldo_do_mes": "0.00",
        "total_gastos": "0.00",
        "gastos_por_categoria": [],
        "maiores_gastos": [],
    }


def test_relatorio_le_as_parcelas_das_dividas(cliente_com_token):
    # Caso 8 do Módulo 12, pela API: a parcela não paga de outubro (200) vira a
    # categoria "Dívidas" e entra nas saidas; a paga de outubro e a de
    # novembro não contam
    divida = Divida.objects.create(
        credor="Tia Ana",
        valor_total=Decimal("450.00"),
        total_parcelas=3,
        mes_inicio=date(2026, 10, 1),
    )
    for numero, mes, valor, paga in [
        (1, date(2026, 10, 1), "200.00", False),
        (2, date(2026, 10, 1), "150.00", True),
        (3, date(2026, 11, 1), "100.00", False),
    ]:
        ParcelaDaDivida.objects.create(
            divida=divida, numero=numero, mes=mes, valor=Decimal(valor), paga=paga
        )

    dados = cliente_com_token.get("/api/relatorio/?mes=2026-10").json()

    assert dados["saidas"] == "200.00"
    assert dados["total_gastos"] == "200.00"
    assert dados["gastos_por_categoria"] == [
        {
            "categoria": "Dívidas",
            "categoria_original": "",
            "total": "200.00",
            "porcentagem": 100,
        }
    ]
    assert dados["maiores_gastos"] == []


def test_relatorio_le_os_gastos_fixos(cliente_com_token):
    # Caso 8 do Módulo 14, pela API: o fixo a pagar de outubro (200) vira a
    # categoria "Gastos fixos" e entra nas saidas; o que só começa em
    # novembro não conta
    GastoFixo.objects.create(
        nome="Aluguel", valor=Decimal("200.00"), mes_inicio=date(2026, 10, 1)
    )
    GastoFixo.objects.create(
        nome="Água", valor=Decimal("70.00"), mes_inicio=date(2026, 11, 1)
    )

    dados = cliente_com_token.get("/api/relatorio/?mes=2026-10").json()

    assert dados["saidas"] == "200.00"
    assert dados["total_gastos"] == "200.00"
    assert dados["gastos_por_categoria"] == [
        {
            "categoria": "Gastos fixos",
            "categoria_original": "",
            "total": "200.00",
            "porcentagem": 100,
        }
    ]


def test_relatorio_mes_invalido_responde_400_com_mensagem(cliente_com_token):
    # Caso 6: mês 13 ou texto qualquer recebe 400 com a mesma mensagem do resumo
    for mes in ["2026-13", "abc"]:
        resposta = cliente_com_token.get(f"/api/relatorio/?mes={mes}")

        assert resposta.status_code == 400
        assert resposta.json() == {"detail": MES_INVALIDO}
