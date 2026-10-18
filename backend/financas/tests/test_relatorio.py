from datetime import date
from decimal import Decimal

import pytest

from financas.models import Conexao, Conta, Transacao
from financas.services.relatorio import relatorio_do_mes
from financas.services.resumo import resumo_do_mes

HOJE = date(2026, 10, 8)
OUTUBRO = date(2026, 10, 1)


@pytest.fixture
def conexao(db):
    return Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")


@pytest.fixture
def corrente(conexao):
    return Conta.objects.create(
        conexao=conexao, tipo="corrente", nome="Conta Nubank", saldo=Decimal(0)
    )


@pytest.fixture
def cartao(conexao):
    return Conta.objects.create(
        conexao=conexao, tipo="cartao", nome="Cartão Nubank", saldo=Decimal(0)
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


def test_entradas_saidas_e_saldo_iguais_ao_resumo(corrente, cartao):
    # Caso 1: com tudo misturado, entradas e saidas batem com as do resumo do
    # mesmo mês, e o saldo do mês é entradas menos saidas (1000 - 1290 = -290)
    criar_transacao(corrente, descricao="Salário", valor=Decimal("1000.00"))
    criar_transacao(corrente, descricao="Aluguel", valor=Decimal("-800.00"))
    criar_transacao(
        corrente,
        descricao="Pagamento de fatura",
        valor=Decimal("-490.00"),
        categoria_pluggy="Transfers",
    )
    criar_transacao(
        corrente,
        descricao="Aplicação",
        valor=Decimal("-300.00"),
        categoria_pluggy="Investments",
    )
    criar_transacao(
        corrente,
        descricao="Pix para mim",
        valor=Decimal("200.00"),
        categoria_pluggy="Same person transfer - PIX",
    )
    criar_transacao(cartao, descricao="Mercado", valor=Decimal("-150.00"))
    criar_transacao(corrente, data=date(2026, 9, 30), valor=Decimal("-70.00"))

    relatorio = relatorio_do_mes(OUTUBRO)
    resumo = resumo_do_mes(OUTUBRO, HOJE)

    assert relatorio["mes"] == "2026-10"
    assert relatorio["entradas"] == resumo["entradas"] == Decimal("1000.00")
    assert relatorio["saidas"] == resumo["saidas"] == Decimal("1290.00")
    assert relatorio["saldo_do_mes"] == Decimal("-290.00")


def test_gastos_somam_corrente_e_cartao_e_tiram_o_que_nao_e_gasto(corrente, cartao):
    # Caso 2: gastos = Padaria (corrente) + Mercado (cartão) = 10 + 150 = 160.
    # Ficam de fora: transferência entre contas próprias, investimento, "Credit
    # card payment", os dois jeitos de pagamento de fatura com "fatura" na
    # descrição da corrente, a entrada e o gasto de setembro
    padaria = criar_transacao(corrente, descricao="Padaria", valor=Decimal("-10.00"))
    mercado = criar_transacao(cartao, descricao="Mercado", valor=Decimal("-150.00"))
    criar_transacao(
        corrente, valor=Decimal("-500.00"), categoria_pluggy="Same person transfer"
    )
    criar_transacao(corrente, valor=Decimal("-300.00"), categoria_pluggy="Fixed income")
    criar_transacao(
        corrente, valor=Decimal("-400.00"), categoria_pluggy="Credit card payment"
    )
    for descricao in [
        "Pagamento de fatura",
        "Pagamento efetuado - Pagamento Fatura - Nubank",
    ]:
        criar_transacao(
            corrente,
            descricao=descricao,
            valor=Decimal("-490.00"),
            categoria_pluggy="Transfers",
        )
    criar_transacao(corrente, descricao="Salário", valor=Decimal("3000.00"))
    criar_transacao(corrente, data=date(2026, 9, 30), valor=Decimal("-70.00"))

    relatorio = relatorio_do_mes(OUTUBRO)

    assert relatorio["total_gastos"] == Decimal("160.00")
    assert relatorio["maiores_gastos"] == [mercado, padaria]


def test_fatura_na_descricao_do_cartao_continua_gasto(cartao):
    # Caso 3: a palavra "fatura" só tira o gasto quando ele é da corrente; uma
    # compra do cartão com "fatura" na descrição continua sendo gasto
    compra = criar_transacao(
        cartao, descricao="Loja Fatura Certa", valor=Decimal("-80.00")
    )

    relatorio = relatorio_do_mes(OUTUBRO)

    assert relatorio["total_gastos"] == Decimal("80.00")
    assert relatorio["maiores_gastos"] == [compra]


def test_gastos_por_categoria(corrente, cartao):
    # Caso 4: Mercado (Groceries 300 + manual 100 = 400), Transferências (Pix de
    # 200, mas a categoria manual "Groceries" vence a da Pluggy no de 100) e Sem
    # categoria (100). Total 700: 400/700 = 57,14% vira 57; 200/700 = 28,57%
    # vira 28; 100/700 = 14,28% vira 14 (sempre para baixo)
    traducoes = {"Groceries": "Mercado", "Transfers": "Transferências"}
    criar_transacao(cartao, valor=Decimal("-300.00"), categoria_pluggy="Groceries")
    criar_transacao(corrente, valor=Decimal("-200.00"), categoria_pluggy="Transfers")
    criar_transacao(
        corrente,
        valor=Decimal("-100.00"),
        categoria_pluggy="Transfers",
        categoria_manual="Groceries",
    )
    criar_transacao(cartao, valor=Decimal("-100.00"))

    relatorio = relatorio_do_mes(OUTUBRO, traducoes=traducoes)

    assert relatorio["total_gastos"] == Decimal("700.00")
    assert relatorio["gastos_por_categoria"] == [
        {
            "categoria": "Mercado",
            "categoria_original": "Groceries",
            "total": Decimal("400.00"),
            "porcentagem": 57,
        },
        {
            "categoria": "Transferências",
            "categoria_original": "Transfers",
            "total": Decimal("200.00"),
            "porcentagem": 28,
        },
        {
            "categoria": "Sem categoria",
            "categoria_original": "",
            "total": Decimal("100.00"),
            "porcentagem": 14,
        },
    ]


def test_categorias_com_o_mesmo_total_seguem_o_nome(cartao):
    # Caso 4: no empate do total, a ordem é pelo nome mostrado (traduzido):
    # "Mercado" antes de "Transporte", mesmo com "Taxi" vindo antes em inglês
    traducoes = {"Groceries": "Mercado", "Taxi and ride-hailing": "Transporte"}
    criar_transacao(
        cartao, valor=Decimal("-50.00"), categoria_pluggy="Taxi and ride-hailing"
    )
    criar_transacao(cartao, valor=Decimal("-50.00"), categoria_pluggy="Groceries")

    relatorio = relatorio_do_mes(OUTUBRO, traducoes=traducoes)

    nomes = [grupo["categoria"] for grupo in relatorio["gastos_por_categoria"]]
    assert nomes == ["Mercado", "Transporte"]


def test_maiores_gastos_sao_os_cinco_maiores(corrente, cartao):
    # Caso 5: de 7 gastos, vêm os 5 de maior valor (em módulo), do maior para
    # o menor; a entrada de 5000 não é gasto e não entra
    gastos = {
        valor: criar_transacao(cartao, descricao=f"Gasto {valor}", valor=-valor)
        for valor in [Decimal(10), Decimal(70), Decimal(30), Decimal(50)]
    }
    for valor in [Decimal(20), Decimal(60), Decimal(40)]:
        gastos[valor] = criar_transacao(corrente, valor=-valor)
    criar_transacao(corrente, descricao="Salário", valor=Decimal("5000.00"))

    relatorio = relatorio_do_mes(OUTUBRO)

    esperados = [gastos[Decimal(valor)] for valor in [70, 60, 50, 40, 30]]
    assert relatorio["maiores_gastos"] == esperados


def test_mes_segue_os_dias_antes(corrente):
    # Caso 6: com 2 dias antes, outubro começa em 29/09, então o gasto de 30/09
    # entra em outubro; com 0 dias antes, não entra
    criar_transacao(corrente, data=date(2026, 9, 30), valor=Decimal("-25.00"))

    com_dois_dias = relatorio_do_mes(OUTUBRO, dias_antes=2)
    sem_dias = relatorio_do_mes(OUTUBRO, dias_antes=0)

    assert com_dois_dias["total_gastos"] == Decimal("25.00")
    assert sem_dias["total_gastos"] == Decimal("0.00")


def test_sem_gastos_tudo_zero_e_listas_vazias(corrente):
    # Caso 6: só uma entrada no mês, nenhum gasto: total zero, listas vazias e
    # nenhuma divisão por zero na porcentagem
    criar_transacao(corrente, descricao="Salário", valor=Decimal("3000.00"))

    relatorio = relatorio_do_mes(OUTUBRO)

    assert relatorio["total_gastos"] == Decimal("0.00")
    assert relatorio["gastos_por_categoria"] == []
    assert relatorio["maiores_gastos"] == []
    assert relatorio["saldo_do_mes"] == Decimal("3000.00")
