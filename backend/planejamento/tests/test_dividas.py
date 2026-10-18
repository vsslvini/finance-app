from datetime import date
from decimal import Decimal

from planejamento.models import Divida, ParcelaDaDivida
from planejamento.services.dividas import (
    criar_divida,
    gerar_parcelas,
    total_atrasadas,
    total_do_mes,
)

OUTUBRO = date(2026, 10, 1)
NOVEMBRO = date(2026, 11, 1)


def test_gerar_parcelas_a_ultima_leva_a_sobra():
    # Caso 1: 1000 em 3x a partir de novembro de 2026: 1000 / 3 = 333,333...,
    # arredondado para baixo é 333,33; a última leva a sobra (333,34) e cai em
    # janeiro de 2027 (passa da virada do ano)
    parcelas = gerar_parcelas(Decimal("1000.00"), 3, NOVEMBRO)

    assert parcelas == [
        {"numero": 1, "mes": date(2026, 11, 1), "valor": Decimal("333.33")},
        {"numero": 2, "mes": date(2026, 12, 1), "valor": Decimal("333.33")},
        {"numero": 3, "mes": date(2027, 1, 1), "valor": Decimal("333.34")},
    ]


def test_gerar_parcelas_em_uma_vez():
    # Caso 1: 500 em 1x é uma parcela só, com o valor inteiro, no mês escolhido
    parcelas = gerar_parcelas(Decimal("500.00"), 1, NOVEMBRO)

    assert parcelas == [
        {"numero": 1, "mes": NOVEMBRO, "valor": Decimal("500.00")},
    ]


def test_gerar_parcelas_de_100_em_3x():
    # Caso 1: 100 em 3x dá 33,33 + 33,33 + 33,34, e a soma volta a ser 100
    parcelas = gerar_parcelas(Decimal("100.00"), 3, NOVEMBRO)

    valores = [parcela["valor"] for parcela in parcelas]
    assert valores == [Decimal("33.33"), Decimal("33.33"), Decimal("33.34")]
    assert sum(valores) == Decimal("100.00")


def test_criar_divida_salva_a_divida_e_as_parcelas(db):
    # Caso 2: criar a dívida grava as parcelas geradas, ligadas a ela
    divida = criar_divida(
        credor="Tia Ana",
        motivo="Joia",
        valor_total=Decimal("1000.00"),
        parcelas=3,
        mes_inicio=NOVEMBRO,
    )

    assert Divida.objects.count() == 1
    assert divida.total_parcelas == 3
    parcelas = list(divida.parcelas.values_list("numero", "mes", "valor", "paga"))
    assert parcelas == [
        (1, date(2026, 11, 1), Decimal("333.33"), False),
        (2, date(2026, 12, 1), Decimal("333.33"), False),
        (3, date(2027, 1, 1), Decimal("333.34"), False),
    ]


def criar_divida_vazia(mes_inicio):
    # Só a dívida, sem gerar parcelas: cada teste cria as parcelas que quer
    return Divida.objects.create(
        credor="Tia Ana",
        valor_total=Decimal("1000.00"),
        total_parcelas=1,
        mes_inicio=mes_inicio,
    )


def criar_parcela(divida, mes, valor, paga=False):
    return ParcelaDaDivida.objects.create(
        divida=divida, numero=1, mes=mes, valor=valor, paga=paga
    )


def test_total_do_mes_soma_so_as_nao_pagas_do_mes(db):
    # Caso 6: soma as parcelas não pagas de outubro (100 + 50); a paga de
    # outubro e a de novembro ficam de fora
    divida = criar_divida_vazia(OUTUBRO)
    criar_parcela(divida, OUTUBRO, Decimal("100.00"))
    criar_parcela(divida, OUTUBRO, Decimal("50.00"))
    criar_parcela(divida, OUTUBRO, Decimal("70.00"), paga=True)
    criar_parcela(divida, NOVEMBRO, Decimal("30.00"))

    assert total_do_mes(OUTUBRO) == Decimal("150.00")


def test_total_atrasadas_soma_as_nao_pagas_de_meses_anteriores(db):
    # Caso 7: com o mês atual em outubro, atrasadas são as não pagas de
    # agosto e setembro (40 + 60); a paga de setembro e a de outubro não contam
    divida = criar_divida_vazia(date(2026, 8, 1))
    criar_parcela(divida, date(2026, 8, 1), Decimal("40.00"))
    criar_parcela(divida, date(2026, 9, 1), Decimal("60.00"))
    criar_parcela(divida, date(2026, 9, 1), Decimal("80.00"), paga=True)
    criar_parcela(divida, OUTUBRO, Decimal("100.00"))

    assert total_atrasadas(OUTUBRO) == Decimal("100.00")


def test_sem_parcelas_os_totais_sao_zero(db):
    # Casos 6 e 7: sem nenhuma dívida, os dois totais são 0.00 (e não None)
    assert total_do_mes(OUTUBRO) == Decimal("0.00")
    assert total_atrasadas(OUTUBRO) == Decimal("0.00")
