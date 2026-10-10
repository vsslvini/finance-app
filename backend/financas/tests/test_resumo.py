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
    # Caso: saldo 1200, hoje 08/10: de 08 a 31 são 24 dias, 1200 / 24 = 50.00.
    # A fatura de 400 não é descontada (é paga com o salário do mês seguinte)
    criar_conta(conexao, saldo=Decimal("1200.00"))
    criar_conta(conexao, tipo="cartao", nome="Black", saldo=Decimal("400.00"))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["posso_gastar_por_dia"] == Decimal("50.00")


def test_ultimo_dia_do_mes_conta_um_dia(conexao):
    # Caso: hoje 31/10 ainda conta como 1 dia (sem divisão por zero)
    criar_conta(conexao, saldo=Decimal("1000.00"))
    criar_conta(conexao, tipo="cartao", nome="Black", saldo=Decimal("400.00"))

    resumo = resumo_do_mes(OUTUBRO, date(2026, 10, 31))

    assert resumo["posso_gastar_por_dia"] == Decimal("1000.00")


def test_posso_gastar_arredonda_para_baixo(conexao):
    # Caso: 100 / 3 dias (29, 30 e 31/10) = 33.333..., vira 33.33 (nunca sugerir
    # mais do que se tem)
    criar_conta(conexao, saldo=Decimal("100.00"))

    resumo = resumo_do_mes(OUTUBRO, date(2026, 10, 29))

    assert resumo["posso_gastar_por_dia"] == Decimal("33.33")


def test_saldo_negativo_da_posso_gastar_negativo(conexao):
    # Caso: saldo -240 (cheque especial), 24 dias: -240 / 24 = -10.00
    criar_conta(conexao, saldo=Decimal("-240.00"))

    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert resumo["posso_gastar_por_dia"] == Decimal("-10.00")


def test_salario_no_fim_de_setembro_conta_em_outubro_com_dias_antes(corrente):
    # Caso: salário em 30/09 conta nas entradas de outubro com 2 dias antes
    # (outubro começa em 29/09), e não conta com 0 dias antes
    criar_transacao(
        corrente, data=date(2026, 9, 30), descricao="Salário", valor=Decimal(3000)
    )

    com_dois_dias = resumo_do_mes(OUTUBRO, HOJE, dias_antes=2)
    sem_dias = resumo_do_mes(OUTUBRO, HOJE, dias_antes=0)

    assert com_dois_dias["entradas"] == Decimal("3000.00")
    assert sem_dias["entradas"] == Decimal("0.00")


def test_posso_gastar_vai_ate_o_fim_do_periodo_sem_descontar_fatura(conexao):
    # Caso: hoje 10/10, 2 dias antes: outubro vai até 29/10, então de 10 a 29
    # são 20 dias. Saldo 2000 / 20 = 100.00; a fatura de 1240 não entra
    criar_conta(conexao, saldo=Decimal("2000.00"))
    criar_conta(conexao, tipo="cartao", nome="Black", saldo=Decimal("1240.00"))

    resumo = resumo_do_mes(OUTUBRO, date(2026, 10, 10), dias_antes=2)

    assert resumo["posso_gastar_por_dia"] == Decimal("100.00")


def test_posso_gastar_com_dias_antes_arredonda_para_baixo(conexao):
    # Caso: hoje 27/10, 2 dias antes: faltam 27, 28 e 29/10 (3 dias);
    # 100 / 3 = 33.333..., vira 33.33
    criar_conta(conexao, saldo=Decimal("100.00"))

    resumo = resumo_do_mes(OUTUBRO, date(2026, 10, 27), dias_antes=2)

    assert resumo["posso_gastar_por_dia"] == Decimal("33.33")


def test_com_dias_antes_dia_30_outubro_ja_acabou(conexao):
    # Caso: com 2 dias antes, no dia 30/10 o mês atual já é novembro; olhando
    # outubro, não há mais "por dia"
    criar_conta(conexao, saldo=Decimal("1000.00"))

    resumo = resumo_do_mes(OUTUBRO, date(2026, 10, 30), dias_antes=2)

    assert resumo["posso_gastar_por_dia"] is None


def test_fatura_acima_do_limite_avisa(cartao):
    # Caso: fatura de 1500.01 com limite de 1500.00 passa do limite
    cartao.saldo = Decimal("1500.01")
    cartao.save()

    resumo = resumo_do_mes(OUTUBRO, HOJE, limite=Decimal("1500.00"))

    assert resumo["limite_fatura"] == Decimal("1500.00")
    assert resumo["fatura_acima_do_limite"] is True


def test_fatura_igual_ou_abaixo_do_limite_nao_avisa(cartao):
    # Caso: fatura igual ao limite ou abaixo dele não passa do limite
    cartao.saldo = Decimal("1500.00")
    cartao.save()

    for limite in [Decimal("1500.00"), Decimal("2000.00")]:
        resumo = resumo_do_mes(OUTUBRO, HOJE, limite=limite)

        assert resumo["fatura_acima_do_limite"] is False


def test_sem_limite_nao_avisa(cartao):
    # Caso: sem limite definido (None), nunca avisa, por maior que seja a fatura
    cartao.saldo = Decimal("99999.00")
    cartao.save()

    resumo = resumo_do_mes(OUTUBRO, HOJE, limite=None)

    assert resumo["limite_fatura"] is None
    assert resumo["fatura_acima_do_limite"] is False


def test_outro_mes_nao_tem_posso_gastar(conexao):
    # Caso: olhando setembro com hoje em outubro, não faz sentido "por dia"
    criar_conta(conexao, saldo=Decimal("1000.00"))

    resumo = resumo_do_mes(date(2026, 9, 1), HOJE)

    assert resumo["posso_gastar_por_dia"] is None


def test_mes_atual_traz_o_mes_o_dia_e_o_total_de_dias(db):
    # Caso: 2 dias antes, hoje 10/10: outubro vai de 29/09 a 29/10 (31 dias),
    # e 10/10 é o dia 12 desse período
    resumo = resumo_do_mes(OUTUBRO, date(2026, 10, 10), dias_antes=2)

    assert resumo["mes"] == "2026-10"
    assert resumo["dia_do_mes"] == 12
    assert resumo["dias_no_mes"] == 31


def test_outro_mes_tem_o_mes_mas_nao_o_dia(db):
    # Caso: olhando setembro com hoje em outubro, o mês vem preenchido, mas o
    # dia e o total de dias vêm None (só fazem sentido no mês de hoje)
    resumo = resumo_do_mes(date(2026, 9, 1), HOJE)

    assert resumo["mes"] == "2026-09"
    assert resumo["dia_do_mes"] is None
    assert resumo["dias_no_mes"] is None


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
