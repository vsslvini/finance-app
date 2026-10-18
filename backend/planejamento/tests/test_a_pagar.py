from datetime import date
from decimal import Decimal

import pytest

from planejamento.models import GastoFixo, PagamentoDeGastoFixo
from planejamento.services.a_pagar import meses_a_pagar, percentual_da_renda
from planejamento.services.dividas import criar_divida

# "Hoje" dos testes: 18/10/2026, o dia em que o módulo foi pedido
HOJE = date(2026, 10, 18)
OUTUBRO = date(2026, 10, 1)
NOVEMBRO = date(2026, 11, 1)
DEZEMBRO = date(2026, 12, 1)

pytestmark = pytest.mark.django_db


def criar_fixo(valor, mes_inicio=OUTUBRO, nome="Fixo"):
    return GastoFixo.objects.create(
        nome=nome, valor=Decimal(valor), mes_inicio=mes_inicio
    )


def criar_divida_em_3x(valor_total="1000.00", mes_inicio=OUTUBRO):
    return criar_divida("Fulano", "", Decimal(valor_total), 3, mes_inicio)


def test_sem_nada_cadastrado_devolve_6_meses_zerados():
    # Caso 1: sem fixos nem dívidas, a lista tem 6 meses a partir do mês atual
    # e todos os valores são 0.00 (nunca None)
    meses = meses_a_pagar(HOJE, 0)

    assert [mes["mes"] for mes in meses] == [
        date(2026, 10, 1),
        date(2026, 11, 1),
        date(2026, 12, 1),
        date(2027, 1, 1),
        date(2027, 2, 1),
        date(2027, 3, 1),
    ]
    for mes in meses:
        for campo in ("fixos", "dividas", "total", "falta"):
            assert mes[campo] == Decimal("0.00")


def test_fixo_que_comeca_no_mes_que_vem_fica_fora_do_mes_atual():
    # Caso 2: o fixo só vale a partir do mês de início; em outubro não conta,
    # de novembro em diante conta em todos os meses
    criar_fixo("300.00", mes_inicio=NOVEMBRO)

    meses = meses_a_pagar(HOJE, 0)

    assert [mes["fixos"] for mes in meses] == [
        Decimal("0.00"),
        Decimal("300.00"),
        Decimal("300.00"),
        Decimal("300.00"),
        Decimal("300.00"),
        Decimal("300.00"),
    ]


def test_parcelas_da_divida_caem_nos_meses_certos():
    # Caso 3: 1000 em 3x a partir de outubro = 333.33, 333.33 e 333.34 em
    # outubro, novembro e dezembro; de janeiro em diante não há parcela
    criar_divida_em_3x()

    meses = meses_a_pagar(HOJE, 0)

    assert [mes["dividas"] for mes in meses] == [
        Decimal("333.33"),
        Decimal("333.33"),
        Decimal("333.34"),
        Decimal("0.00"),
        Decimal("0.00"),
        Decimal("0.00"),
    ]


def test_total_e_fixos_mais_dividas():
    # Caso 4: o total do mês é a soma dos fixos com as parcelas
    criar_fixo("1600.40")
    criar_divida_em_3x()

    outubro = meses_a_pagar(HOJE, 0)[0]

    assert outubro["fixos"] == Decimal("1600.40")
    assert outubro["dividas"] == Decimal("333.33")
    assert outubro["total"] == Decimal("1933.73")


def test_falta_do_mes_atual_nao_conta_o_que_ja_foi_pago():
    # Caso 5: fixo pago à mão e parcela paga saem do "falta", mas continuam no
    # total (o total é o custo do mês; o falta é o que ainda não saiu da conta)
    pago = criar_fixo("500.00", nome="Pago")
    criar_fixo("100.00", nome="A pagar")
    PagamentoDeGastoFixo.objects.create(gasto=pago, mes=OUTUBRO)
    divida = criar_divida("Fulano", "", Decimal("300.00"), 3, OUTUBRO)
    primeira = divida.parcelas.get(numero=1)
    primeira.paga = True
    primeira.save()

    outubro = meses_a_pagar(HOJE, 0)[0]

    assert outubro["total"] == Decimal("700.00")
    # Só o fixo "A pagar" (100) falta; a parcela de outubro (100) está paga
    assert outubro["falta"] == Decimal("100.00")


def test_falta_dos_meses_seguintes_e_tudo_que_ainda_nao_foi_pago():
    # Caso 6: em novembro nada foi pago ainda, então o falta soma todos os
    # fixos (mesmo o que foi pago em outubro) mais as parcelas não pagas
    pago = criar_fixo("500.00", nome="Pago")
    criar_fixo("100.00", nome="A pagar")
    PagamentoDeGastoFixo.objects.create(gasto=pago, mes=OUTUBRO)
    criar_divida("Fulano", "", Decimal("300.00"), 3, OUTUBRO)

    novembro = meses_a_pagar(HOJE, 0)[1]

    assert novembro["fixos"] == Decimal("600.00")
    assert novembro["dividas"] == Decimal("100.00")
    assert novembro["falta"] == Decimal("700.00")


def test_percentual_da_renda_com_uma_casa():
    # Caso 7: 1933.73 de 5000.00 = 38,6746%, arredondado para 38.7; sem renda
    # (None) ou com renda zero não há percentual (e não divide por zero)
    total = Decimal("1933.73")

    assert percentual_da_renda(total, Decimal("5000.00")) == Decimal("38.7")
    assert percentual_da_renda(total, None) is None
    assert percentual_da_renda(total, Decimal("0.00")) is None


def test_percentual_arredonda_meio_para_cima():
    # Caso 7: 0,05% exato vira 0.1 (e não 0.0 como no arredondamento do
    # banqueiro, que o Python usa se ninguém pedir outra coisa)
    assert percentual_da_renda(Decimal("5.00"), Decimal("10000.00")) == Decimal("0.1")


def test_o_mes_atual_segue_os_dias_antes_do_mes():
    # Caso 8: no dia 30/10 com o mês começando 2 dias antes, já é novembro do
    # app, então a lista começa em novembro
    meses = meses_a_pagar(date(2026, 10, 30), 2)

    assert meses[0]["mes"] == NOVEMBRO
    assert meses[1]["mes"] == DEZEMBRO


def test_a_lista_passa_da_virada_do_ano():
    # Caso 9: novembro + 5 meses = abril do ano seguinte (e não "mês 16")
    meses = meses_a_pagar(date(2026, 11, 15), 0)

    assert meses[0]["mes"] == NOVEMBRO
    assert meses[-1]["mes"] == date(2027, 4, 1)
