from datetime import date
from decimal import Decimal

import pytest

from financas.models import Conexao, Conta, Transacao
from financas.services.resumo import resumo_do_mes

# Dia fixo: o service recebe "hoje" como parâmetro, então os testes não
# dependem do dia em que rodam
HOJE = date(2026, 10, 8)
OUTUBRO = date(2026, 10, 1)


@pytest.fixture
def conexao(db):
    return Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")


def criar_conta(conexao, **campos):
    # Conta corrente com saldo zero; cada teste troca só o que importa
    dados = {
        "tipo": "corrente",
        "nome": "Conta Nubank",
        "saldo": Decimal("0.00"),
    }
    dados.update(campos)
    return Conta.objects.create(conexao=conexao, **dados)


@pytest.fixture
def corrente(conexao):
    return criar_conta(conexao)


@pytest.fixture
def cartao(conexao):
    return criar_conta(conexao, tipo="cartao", nome="Cartão Nubank")


def criar_transacao(conta, **campos):
    # Transação com valores padrão; cada teste troca só o que importa
    dados = {
        "data": date(2026, 10, 5),
        "descricao": "Padaria",
        "valor": Decimal("-10.00"),
    }
    dados.update(campos)
    return Transacao.objects.create(conta=conta, **dados)


def test_saldo_soma_correntes_e_fatura_soma_cartoes(conexao):
    # Caso: saldo_total soma só as contas correntes; fatura_aberta soma só os cartões
    criar_conta(conexao, saldo=Decimal("1000.00"))
    criar_conta(conexao, nome="Conta Inter", saldo=Decimal("250.50"))
    criar_conta(conexao, tipo="cartao", nome="Black", saldo=Decimal("400.00"))
    criar_conta(conexao, tipo="cartao", nome="Roxinho", saldo=Decimal("99.90"))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["saldo_total"] == Decimal("1250.50")
    assert resumo["fatura_aberta"] == Decimal("499.90")


def test_entradas_somam_positivos_da_corrente_no_mes(corrente):
    # Caso: entradas soma os valores positivos das correntes do mês; outro mês
    # fica de fora
    criar_transacao(corrente, descricao="Salário", valor=Decimal("3000.00"))
    criar_transacao(corrente, descricao="Pix recebido", valor=Decimal("50.25"))
    criar_transacao(corrente, valor=Decimal("-10.00"))
    criar_transacao(
        corrente, data=date(2026, 9, 30), descricao="Setembro", valor=Decimal(700)
    )
    criar_transacao(
        corrente, data=date(2026, 11, 1), descricao="Novembro", valor=Decimal(800)
    )

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["entradas"] == Decimal("3050.25")


def test_saidas_somam_cartao_e_corrente(corrente, cartao):
    # Caso: saidas soma as compras do cartão e as saídas da corrente, como
    # valor positivo
    criar_transacao(cartao, descricao="Mercado", valor=Decimal("-200.00"))
    criar_transacao(corrente, descricao="Aluguel", valor=Decimal("-1000.00"))
    criar_transacao(corrente, descricao="Salário", valor=Decimal("3000.00"))
    criar_transacao(cartao, data=date(2026, 9, 30), valor=Decimal("-500.00"))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["saidas"] == Decimal("1200.00")


def test_pagamento_de_fatura_nao_conta_em_saidas(corrente, cartao):
    # Caso: "Credit card payment" na corrente não conta em saidas (as compras já
    # contaram no cartão; contar o pagamento seria contar duas vezes)
    criar_transacao(cartao, descricao="Mercado", valor=Decimal("-200.00"))
    criar_transacao(
        corrente,
        descricao="Pagamento fatura",
        valor=Decimal("-200.00"),
        categoria_pluggy="Credit card payment",
    )

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["saidas"] == Decimal("200.00")


def test_transferencia_entre_contas_proprias_nao_conta(corrente):
    # Caso: "Same person transfer - PIX" (e variações, como "- TED") não conta
    # em entradas nem em saidas
    for categoria in ["Same person transfer - PIX", "Same person transfer - TED"]:
        criar_transacao(corrente, valor=Decimal("500.00"), categoria_pluggy=categoria)
        criar_transacao(corrente, valor=Decimal("-500.00"), categoria_pluggy=categoria)
    criar_transacao(corrente, descricao="Salário", valor=Decimal("3000.00"))
    criar_transacao(corrente, descricao="Padaria", valor=Decimal("-10.00"))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["entradas"] == Decimal("3000.00")
    assert resumo["saidas"] == Decimal("10.00")


def test_positivo_no_cartao_nao_conta_como_entrada(cartao):
    # Caso: estorno no cartão (valor positivo) não é dinheiro que entrou
    criar_transacao(cartao, descricao="Estorno", valor=Decimal("80.00"))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["entradas"] == Decimal("0.00")


def test_posso_gastar_por_dia_divide_pelos_dias_restantes(conexao):
    # Caso: saldo 1000, fatura 400, hoje 08/10: de 08 a 31 são 24 dias,
    # (1000 - 400) / 24 = 25.00
    criar_conta(conexao, saldo=Decimal("1000.00"))
    criar_conta(conexao, tipo="cartao", nome="Black", saldo=Decimal("400.00"))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["posso_gastar_por_dia"] == Decimal("25.00")


def test_ultimo_dia_do_mes_conta_um_dia(conexao):
    # Caso: hoje 31/10 ainda conta como 1 dia (sem divisão por zero)
    criar_conta(conexao, saldo=Decimal("1000.00"))
    criar_conta(conexao, tipo="cartao", nome="Black", saldo=Decimal("400.00"))

    resumo = resumo_do_mes(OUTUBRO, date(2026, 10, 31))

    assert resumo["posso_gastar_por_dia"] == Decimal("600.00")


def test_posso_gastar_arredonda_para_baixo(conexao):
    # Caso: 100 / 3 dias (29, 30 e 31/10) = 33.333..., vira 33.33 (nunca sugerir
    # mais do que se tem)
    criar_conta(conexao, saldo=Decimal("100.00"))

    resumo = resumo_do_mes(OUTUBRO, date(2026, 10, 29))

    assert resumo["posso_gastar_por_dia"] == Decimal("33.33")


def test_fatura_maior_que_saldo_da_valor_negativo(conexao):
    # Caso: saldo 100, fatura 400, 24 dias: (100 - 400) / 24 = -12.50
    criar_conta(conexao, saldo=Decimal("100.00"))
    criar_conta(conexao, tipo="cartao", nome="Black", saldo=Decimal("400.00"))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["posso_gastar_por_dia"] == Decimal("-12.50")


def test_outro_mes_nao_tem_posso_gastar(conexao):
    # Caso: olhando setembro com hoje em outubro, não faz sentido "por dia"
    criar_conta(conexao, saldo=Decimal("1000.00"))

    resumo = resumo_do_mes(date(2026, 9, 1), HOJE)

    assert resumo["posso_gastar_por_dia"] is None


def test_ultimos_gastos(corrente, cartao):
    # Caso: no máximo 5, só saídas, mais nova primeiro, sem data futura e sem
    # pagamento de fatura nem transferência entre contas próprias
    gastos = [
        criar_transacao(cartao, data=date(2026, 10, dia), descricao=f"Dia {dia}")
        for dia in range(1, 8)
    ]
    criar_transacao(cartao, data=date(2026, 10, 9), descricao="Parcela futura")
    criar_transacao(
        corrente,
        data=HOJE,
        descricao="Pagamento fatura",
        categoria_pluggy="Credit card payment",
    )
    criar_transacao(
        corrente,
        data=HOJE,
        descricao="Pix para mim",
        categoria_pluggy="Same person transfer - PIX",
    )
    criar_transacao(corrente, data=HOJE, descricao="Salário", valor=Decimal(3000))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    # Dias 7, 6, 5, 4 e 3 (os 5 mais novos)
    esperados = [gastos[6], gastos[5], gastos[4], gastos[3], gastos[2]]
    assert resumo["ultimos_gastos"] == esperados


def test_sem_dados_tudo_zero(db):
    # Caso: sem contas nem transações, tudo zero e lista vazia, sem erro
    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["saldo_total"] == Decimal("0.00")
    assert resumo["fatura_aberta"] == Decimal("0.00")
    assert resumo["entradas"] == Decimal("0.00")
    assert resumo["saidas"] == Decimal("0.00")
    assert resumo["ultimos_gastos"] == []
