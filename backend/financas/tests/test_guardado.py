from datetime import date
from decimal import Decimal

from financas.services.guardado import bloco_guardado, meses_ate

# Funções puras: sem banco, então os testes não pedem a fixture "db"
OUTUBRO = date(2026, 10, 1)
JULHO_2027 = date(2027, 7, 1)
TOTAL = Decimal("1300.00")
POR_MES = Decimal("500.00")


def test_meses_ate_conta_o_mes_atual_e_o_mes_alvo():
    # Caso 5: de outubro de 2026 a julho de 2027 são 10 meses (os dois contam);
    # o próprio mês conta 1, e um alvo que já passou dá 0
    assert meses_ate(OUTUBRO, JULHO_2027) == 10
    assert meses_ate(OUTUBRO, OUTUBRO) == 1
    assert meses_ate(OUTUBRO, date(2026, 9, 1)) == 0


def test_previsto_sem_ter_guardado_no_mes():
    # Caso 5: 1.300 guardados, 500 por mês, nada guardado em outubro:
    # 1.300 + 10 x 500 = 6.300
    guardado = bloco_guardado(TOTAL, Decimal("0.00"), OUTUBRO, POR_MES, JULHO_2027)

    assert guardado["previsto"] == Decimal("6300.00")


def test_previsto_tendo_guardado_no_mes():
    # Caso 5: o mesmo plano, mas os 500 de outubro já foram guardados (e já
    # estão nos 1.300): outubro não conta de novo, 1.300 + 9 x 500 = 5.800
    guardado = bloco_guardado(TOTAL, Decimal("500.00"), OUTUBRO, POR_MES, JULHO_2027)

    assert guardado["previsto"] == Decimal("5800.00")


def test_previsto_com_mes_alvo_que_ja_passou_e_o_total():
    # Caso 5: mês alvo antes do mês do resumo: não sobra mês, previsto = total
    guardado = bloco_guardado(
        TOTAL, Decimal("0.00"), OUTUBRO, POR_MES, date(2026, 9, 1)
    )

    assert guardado["previsto"] == TOTAL


def test_progresso_arredonda_para_baixo():
    # Caso 6: 1.300 de 5.800 = 22,41%, vira 22; 1.300 de 6.300 = 20,63%, vira 20
    guardou = bloco_guardado(TOTAL, Decimal("500.00"), OUTUBRO, POR_MES, JULHO_2027)
    nao_guardou = bloco_guardado(TOTAL, Decimal("0.00"), OUTUBRO, POR_MES, JULHO_2027)

    assert guardou["progresso"] == 22
    assert nao_guardou["progresso"] == 20


def test_progresso_com_previsto_zero_e_none():
    # Caso 6: nada guardado e plano de 0 por mês: previsto 0, sem divisão por zero
    guardado = bloco_guardado(
        Decimal("0.00"), Decimal("0.00"), OUTUBRO, Decimal("0.00"), JULHO_2027
    )

    assert guardado["previsto"] == Decimal("0.00")
    assert guardado["progresso"] is None


def test_falta_guardar_no_mes():
    # Caso 7: faltam 500 - 300 = 200; guardando mais que o plano, falta 0 (e não
    # um valor negativo)
    faltando = bloco_guardado(TOTAL, Decimal("300.00"), OUTUBRO, POR_MES, JULHO_2027)
    passou = bloco_guardado(TOTAL, Decimal("600.00"), OUTUBRO, POR_MES, JULHO_2027)

    assert faltando["falta_guardar_no_mes"] == Decimal("200.00")
    assert passou["falta_guardar_no_mes"] == Decimal("0.00")


def test_sem_plano_so_total_e_este_mes():
    # Caso 9: sem plano (ou com só um dos dois campos), plano, previsto e
    # progresso ficam None, e não falta nada guardar
    for valor_mensal, mes_alvo in [(None, None), (POR_MES, None), (None, OUTUBRO)]:
        guardado = bloco_guardado(
            TOTAL, Decimal("300.00"), OUTUBRO, valor_mensal, mes_alvo
        )

        assert guardado == {
            "total": TOTAL,
            "este_mes": Decimal("300.00"),
            "plano": None,
            "previsto": None,
            "progresso": None,
            "falta_guardar_no_mes": Decimal("0.00"),
        }
