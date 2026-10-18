from datetime import date
from decimal import Decimal

import pytest

from financas.models import Conexao, Conta, Transacao
from financas.services.faturas_futuras import (
    descricao_sem_parcela,
    estimar_faturas,
    projetar_parcelas,
)

# Os testes de projetar_parcelas e descricao_sem_parcela não pedem a fixture
# "db": são funções puras. As transações são criadas com Transacao(...) sem
# save(), só como objetos Python; criar o objeto não fala com o banco


def parcela(data, atual, total, valor="-100.00", descricao="LOJA X", conta_id=1):
    # Uma parcela de cartão com valores padrão; cada teste troca só o que importa
    return Transacao(
        conta_id=conta_id,
        data=data,
        descricao=descricao,
        valor=Decimal(valor),
        parcela_atual=atual,
        total_parcelas=total,
    )


def totais(meses):
    # {"2026-11": Decimal(...), ...}: mais fácil de comparar nos testes
    return {item["mes"]: item["total"] for item in meses}


CEM = Decimal("100.00")
ZERO = Decimal("0.00")


def test_compra_em_6x_projeta_as_parcelas_que_faltam():
    # Caso 1: parcela 2 de 6 em outubro (mês atual). As parcelas 3 a 6 caem de
    # novembro a fevereiro; março e abril ficam zerados
    meses = projetar_parcelas([parcela(date(2026, 10, 15), 2, 6)], 2026, 10)

    assert totais(meses) == {
        "2026-11": CEM,
        "2026-12": CEM,
        "2027-01": CEM,
        "2027-02": CEM,
        "2027-03": ZERO,
        "2027-04": ZERO,
    }


def test_serie_vista_em_varios_meses_conta_uma_vez_so():
    # Caso 2: 1/6 em agosto, 2/6 em setembro e 3/6 em outubro são a mesma
    # compra; vale só a 3/6 (parcelas 4 a 6 de novembro a janeiro). Se cada uma
    # contasse, novembro teria 300
    transacoes = [
        parcela(date(2026, 8, 15), 1, 6),
        parcela(date(2026, 9, 15), 2, 6),
        parcela(date(2026, 10, 15), 3, 6),
    ]

    meses = projetar_parcelas(transacoes, 2026, 10)

    assert totais(meses) == {
        "2026-11": CEM,
        "2026-12": CEM,
        "2027-01": CEM,
        "2027-02": ZERO,
        "2027-03": ZERO,
        "2027-04": ZERO,
    }


def test_empate_na_parcela_vale_a_data_mais_recente():
    # Caso 2 (desempate): a mesma 3/6 vista em setembro e em outubro. Vale a de
    # outubro, então a última parcela cai em janeiro (pela de setembro, cairia
    # em dezembro)
    transacoes = [
        parcela(date(2026, 10, 15), 3, 6),
        parcela(date(2026, 9, 15), 3, 6),
    ]

    meses = projetar_parcelas(transacoes, 2026, 10)

    assert totais(meses)["2027-01"] == CEM


def test_parcela_com_data_futura_conta_uma_vez_e_segue_dela():
    # Caso 3: a 4/6 já chegou com data de novembro. Ela conta em novembro e a
    # projeção segue dela (dezembro e janeiro); novembro não conta duas vezes
    # (pela 3/6 de outubro e pela 4/6)
    transacoes = [
        parcela(date(2026, 10, 15), 3, 6),
        parcela(date(2026, 11, 15), 4, 6),
    ]

    meses = projetar_parcelas(transacoes, 2026, 10)

    assert totais(meses) == {
        "2026-11": CEM,
        "2026-12": CEM,
        "2027-01": CEM,
        "2027-02": ZERO,
        "2027-03": ZERO,
        "2027-04": ZERO,
    }


def test_sufixo_da_parcela_e_ignorado_na_descricao():
    # Caso 4: "LOJA X 2/6" e "LOJA X 3/6" são a mesma série; se fossem duas,
    # novembro teria 200
    transacoes = [
        parcela(date(2026, 9, 15), 2, 6, descricao="LOJA X 2/6"),
        parcela(date(2026, 10, 15), 3, 6, descricao="LOJA X 3/6"),
    ]

    meses = projetar_parcelas(transacoes, 2026, 10)

    assert totais(meses)["2026-11"] == CEM


def test_descricao_sem_parcela_tira_so_o_sufixo_do_fim():
    # Caso 4: só o " X/Y" do fim sai; sem sufixo, o texto fica igual, e um
    # "2/6" no meio do texto não é sufixo
    assert descricao_sem_parcela("LOJA X 2/6") == "LOJA X"
    assert descricao_sem_parcela("LOJA X 10/12") == "LOJA X"
    assert descricao_sem_parcela("LOJA X") == "LOJA X"
    assert descricao_sem_parcela("LOJA 2/6 X") == "LOJA 2/6 X"


def test_ignora_estorno_parcela_sem_sentido_sem_parcela_e_serie_terminada():
    # Caso 5: estorno (positivo), "3 de 1" (renegociação), parcela 0, sem
    # parcela e a 6/6 em outubro (a série acabou) não entram em mês nenhum
    outubro = date(2026, 10, 15)
    transacoes = [
        parcela(outubro, 2, 6, valor="100.00", descricao="ESTORNO"),
        parcela(outubro, 3, 1, descricao="Encerramento de dívida"),
        parcela(outubro, 0, 6, descricao="PARCELA ZERO"),
        parcela(outubro, None, None, descricao="MERCADO"),
        parcela(outubro, 6, 6, descricao="LOJA TERMINADA"),
    ]

    meses = projetar_parcelas(transacoes, 2026, 10)

    assert all(item["total"] == ZERO for item in meses)
    assert all(item["por_conta"] == {} for item in meses)


def test_sempre_6_meses_depois_do_atual_com_virada_de_ano():
    # Caso 7: mês atual novembro de 2026: a lista vai de dezembro a maio de
    # 2027, mesmo sem nenhuma parcela, com zero e nenhum cartão
    meses = projetar_parcelas([], 2026, 11)

    assert [item["mes"] for item in meses] == [
        "2026-12",
        "2027-01",
        "2027-02",
        "2027-03",
        "2027-04",
        "2027-05",
    ]
    assert all(item["total"] == ZERO for item in meses)
    assert all(item["por_conta"] == {} for item in meses)


# Daqui para baixo, testes de estimar_faturas, que busca no banco (fixture "db")


@pytest.fixture
def nubank(db):
    return Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")


@pytest.fixture
def inter(db):
    return Conexao.objects.create(id_pluggy="item-inter", nome_banco="Inter")


def criar_conta(conexao, **campos):
    # Cartão com saldo zero; cada teste troca só o que importa
    dados = {"tipo": "cartao", "nome": "gold", "saldo": Decimal("0.00")}
    dados.update(campos)
    return Conta.objects.create(conexao=conexao, **dados)


def criar_parcela(conta, data, atual, total, valor="-100.00", descricao="LOJA X"):
    return Transacao.objects.create(
        conta=conta,
        data=data,
        descricao=descricao,
        valor=Decimal(valor),
        parcela_atual=atual,
        total_parcelas=total,
    )


def test_ignora_parcela_da_conta_corrente(nubank):
    # Caso 5: parcela na conta corrente (ex.: empréstimo) não é fatura de cartão
    corrente = criar_conta(nubank, tipo="corrente", nome="Conta Nubank")
    criar_parcela(corrente, date(2026, 10, 15), 2, 6)

    dados = estimar_faturas(date(2026, 10, 15))

    assert all(mes["total"] == ZERO for mes in dados["meses"])
    assert all(mes["cartoes"] == [] for mes in dados["meses"])


def test_dois_cartoes_somam_no_mes_e_aparecem_separados(nubank, inter):
    # Caso 6: Nubank com a 5/6 de 50,50 em outubro (só novembro) e Inter com a
    # 1/3 de 100 em outubro (novembro e dezembro). Novembro soma os dois, na
    # ordem da API de contas (Inter antes de Nubank); em dezembro o Nubank não
    # aparece. O Nubank foi criado antes, para a ordem não vir da criação
    gold = criar_conta(nubank, nome="gold")
    cartao_inter = criar_conta(inter, nome="Cartão Inter")
    criar_parcela(gold, date(2026, 10, 10), 5, 6, valor="-50.50")
    criar_parcela(cartao_inter, date(2026, 10, 12), 1, 3)

    dados = estimar_faturas(date(2026, 10, 15))

    novembro, dezembro = dados["meses"][0], dados["meses"][1]
    assert novembro == {
        "mes": "2026-11",
        "total": Decimal("150.50"),
        "cartoes": [
            {
                "conta": cartao_inter.id,
                "nome_banco": "Inter",
                "nome_conta": "Cartão Inter",
                "total": CEM,
            },
            {
                "conta": gold.id,
                "nome_banco": "Nubank",
                "nome_conta": "gold",
                "total": Decimal("50.50"),
            },
        ],
    }
    assert dezembro["total"] == CEM
    assert [cartao["conta"] for cartao in dezembro["cartoes"]] == [cartao_inter.id]


def test_comeca_depois_do_mes_atual_do_app_com_dias_antes(db):
    # Caso 7: com 2 dias antes, em 30/10 o mês do app já é novembro, então a
    # lista começa em dezembro e tem 6 meses
    dados = estimar_faturas(date(2026, 10, 30), dias_antes=2)

    assert [mes["mes"] for mes in dados["meses"]] == [
        "2026-12",
        "2027-01",
        "2027-02",
        "2027-03",
        "2027-04",
        "2027-05",
    ]
