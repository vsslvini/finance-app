from datetime import date

from financas.services.periodo import mes_atual, periodo_do_mes

# Funções puras: só datas entrando e saindo, sem banco (nada de db aqui)


def test_sem_dias_antes_outubro_e_o_mes_do_calendario():
    # Caso: com 0 dias antes, outubro de 2026 vai de 01/10 a 31/10
    assert periodo_do_mes(2026, 10, 0) == (date(2026, 10, 1), date(2026, 10, 31))


def test_com_dois_dias_antes_outubro_comeca_em_setembro():
    # Caso: com 2 dias antes, outubro de 2026 vai de 29/09 a 29/10
    assert periodo_do_mes(2026, 10, 2) == (date(2026, 9, 29), date(2026, 10, 29))


def test_com_dois_dias_antes_fevereiro():
    # Caso: com 2 dias antes, fevereiro de 2027 (28 dias) vai de 30/01 a 26/02
    assert periodo_do_mes(2027, 2, 2) == (date(2027, 1, 30), date(2027, 2, 26))


def test_com_dois_dias_antes_dia_30_de_outubro_ja_e_novembro():
    # Caso: com 2 dias antes, 30/10/2026 já é novembro; 29/10 ainda é outubro
    assert mes_atual(date(2026, 10, 30), 2) == (2026, 11)
    assert mes_atual(date(2026, 10, 29), 2) == (2026, 10)
