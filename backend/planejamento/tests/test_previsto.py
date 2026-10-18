from datetime import date
from decimal import Decimal

import pytest

from financas.models import Conexao, Conta, Transacao
from planejamento.models import (
    Divida,
    GastoFixo,
    PagamentoDeGastoFixo,
    ParcelaDaDivida,
)
from planejamento.services.previsto import calcular_previsto, mes_da_fatura

# "Hoje" dos testes: 18/10/2026, o dia em que o módulo foi pedido
HOJE = date(2026, 10, 18)
SETEMBRO = date(2026, 9, 1)
OUTUBRO = date(2026, 10, 1)
NOVEMBRO = date(2026, 11, 1)
DEZEMBRO = date(2026, 12, 1)


# Parte 1: em que mês a fatura vence (regra pura, sem banco)


def test_vencimento_futuro_neste_mes_vence_neste_mes():
    # Caso 7: vencimento daqui a uma semana, ainda em outubro
    assert mes_da_fatura(HOJE, 0, date(2026, 10, 25)) == OUTUBRO


def test_vencimento_hoje_ainda_vence_neste_mes():
    # Caso 7: "hoje ou depois" inclui o próprio dia
    assert mes_da_fatura(HOJE, 0, HOJE) == OUTUBRO


def test_vencimento_no_passado_manda_a_fatura_para_o_mes_que_vem():
    # Caso 7: o caso real (vencimento 7 de outubro, hoje 18): a Pluggy não
    # atualizou a data, e a fatura aberta é a seguinte
    assert mes_da_fatura(HOJE, 0, date(2026, 10, 7)) == NOVEMBRO


def test_vencimento_vazio_manda_a_fatura_para_o_mes_que_vem():
    # Caso 7: sem data, o mesmo que data velha
    assert mes_da_fatura(HOJE, 0, None) == NOVEMBRO


def test_vencimento_depois_do_mes_que_vem_cai_no_mes_dele():
    # Caso 7: a função só diz o mês; quem decide ignorar é o calcular_previsto
    assert mes_da_fatura(HOJE, 0, date(2026, 12, 20)) == DEZEMBRO


def test_vencimento_no_fim_do_mes_segue_o_mes_do_app():
    # Caso 7: com o mês começando 2 dias antes, 30/10 já é novembro do app
    assert mes_da_fatura(HOJE, 2, date(2026, 10, 30)) == NOVEMBRO


def test_mes_que_vem_passa_da_virada_do_ano():
    # Caso 7: hoje em dezembro, sem data, a fatura vence em janeiro do ano seguinte
    assert mes_da_fatura(date(2026, 12, 18), 0, None) == date(2027, 1, 1)


# Parte 2: o bloco inteiro, lendo o banco


@pytest.fixture
def cenario(db):
    # Hoje 18/10/2026. Dois bancos com cartões e fixos em todas as situações.
    # Cada teste confere um dos dois meses
    nubank = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    inter = Conexao.objects.create(id_pluggy="item-inter", nome_banco="Inter")
    corrente = Conta.objects.create(
        conexao=nubank, tipo="corrente", nome="Conta Nubank", saldo=Decimal(0)
    )
    # Vence neste mês (25/10): vai para o mês atual
    gold = Conta.objects.create(
        conexao=nubank,
        tipo="cartao",
        nome="gold",
        saldo=Decimal("358.32"),
        data_vencimento=date(2026, 10, 25),
    )
    # Vencimento velho (07/10): a fatura aberta vence no mês que vem
    black = Conta.objects.create(
        conexao=inter,
        tipo="cartao",
        nome="black",
        saldo=Decimal("200.00"),
        data_vencimento=date(2026, 10, 7),
    )
    # Sem fatura (saldo zero): fica fora das duas listas
    Conta.objects.create(
        conexao=inter, tipo="cartao", nome="vazio", saldo=Decimal("0.00")
    )

    # Fixos: a pagar (500), pago sozinho (100), pago à mão (50), só começa em
    # novembro (80)
    GastoFixo.objects.create(
        nome="Apartamento",
        valor=Decimal("500.00"),
        mes_inicio=OUTUBRO,
        trecho_descricao="DIRECIONAL",
    )
    GastoFixo.objects.create(
        nome="Internet",
        valor=Decimal("100.00"),
        mes_inicio=OUTUBRO,
        trecho_descricao="CAKTO",
    )
    Transacao.objects.create(
        conta=corrente,
        data=date(2026, 10, 10),
        descricao="PIX CAKTO PAY",
        valor=Decimal("-100.00"),
    )
    luz = GastoFixo.objects.create(
        nome="Luz", valor=Decimal("50.00"), mes_inicio=OUTUBRO
    )
    PagamentoDeGastoFixo.objects.create(gasto=luz, mes=OUTUBRO)
    GastoFixo.objects.create(nome="Água", valor=Decimal("80.00"), mes_inicio=NOVEMBRO)

    # Dívida: 40 atrasada (setembro), 60 deste mês, 300 do mês que vem
    divida = Divida.objects.create(
        credor="Tia Ana",
        valor_total=Decimal("400.00"),
        total_parcelas=3,
        mes_inicio=SETEMBRO,
    )
    for numero, (mes, valor) in enumerate(
        [(SETEMBRO, "40.00"), (OUTUBRO, "60.00"), (NOVEMBRO, "300.00")], start=1
    ):
        ParcelaDaDivida.objects.create(
            divida=divida, numero=numero, mes=mes, valor=Decimal(valor)
        )
    return {"gold": gold, "black": black}


def test_previsto_do_mes_atual(cenario):
    # Caso 6: falta pagar em outubro = fatura que vence neste mês (358.32) +
    # fixo a pagar (500; o pago sozinho, o pago à mão e o que ainda não
    # começou ficam de fora) + parcela do mês (60) + atrasada (40) = 958.32
    previsto = calcular_previsto(HOJE, 0)

    assert previsto["mes_atual"] == {
        "mes": "2026-10",
        "total": Decimal("958.32"),
        "faturas": [
            {
                "conta": cenario["gold"].id,
                "nome_banco": "Nubank",
                "nome_conta": "gold",
                "valor": Decimal("358.32"),
            }
        ],
        "fixos": Decimal("500.00"),
        "dividas": Decimal("60.00"),
        "atrasadas": Decimal("40.00"),
    }


def test_previsto_do_mes_que_vem(cenario):
    # Caso 7: em novembro, todos os fixos que já começam até lá pelo valor
    # previsto (500 + 100 + 50 + 80 = 730), a parcela de novembro (300) e a
    # fatura de vencimento velho (200) = 1230. Não tem "atrasadas"
    previsto = calcular_previsto(HOJE, 0)

    assert previsto["proximo_mes"] == {
        "mes": "2026-11",
        "total": Decimal("1230.00"),
        "faturas": [
            {
                "conta": cenario["black"].id,
                "nome_banco": "Inter",
                "nome_conta": "black",
                "valor": Decimal("200.00"),
            }
        ],
        "fixos": Decimal("730.00"),
        "dividas": Decimal("300.00"),
    }


def test_previsto_sem_nada_cadastrado_vem_zerado(db):
    # Caso 6: sem fixos, dívidas nem cartões, tudo 0.00 e listas vazias
    previsto = calcular_previsto(HOJE, 0)

    zerado = {"total": Decimal("0.00"), "faturas": [], "fixos": Decimal("0.00")}
    assert previsto["mes_atual"] == {
        "mes": "2026-10",
        **zerado,
        "dividas": Decimal("0.00"),
        "atrasadas": Decimal("0.00"),
    }
    assert previsto["proximo_mes"] == {
        "mes": "2026-11",
        **zerado,
        "dividas": Decimal("0.00"),
    }
