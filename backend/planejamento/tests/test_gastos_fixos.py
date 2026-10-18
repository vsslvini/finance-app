from datetime import date
from decimal import Decimal

import pytest

from financas.models import Conexao, Conta, Transacao
from planejamento.models import GastoFixo, PagamentoDeGastoFixo
from planejamento.services.gastos_fixos import (
    A_PAGAR,
    NAO_COMECOU,
    PAGO_AUTOMATICO,
    PAGO_MANUAL,
    situacao_do_fixo,
    situacoes_do_mes,
    total_a_pagar,
    total_previsto,
)

SETEMBRO = date(2026, 9, 1)
OUTUBRO = date(2026, 10, 1)
NOVEMBRO = date(2026, 11, 1)


# Parte 1: a regra pura, sem banco. Os testes passam as descrições das saídas
# como lista, do jeito que o service as receberia


def test_trecho_casa_com_uma_saida_do_mes_sem_diferenciar_maiusculas():
    # Caso 1: o trecho "direcional" está em "PIX DIRECIONAL ENGENHAR", em
    # maiúsculas, então o fixo está pago sozinho
    situacao = situacao_do_fixo(
        OUTUBRO, OUTUBRO, "direcional", ["Padaria", "PIX DIRECIONAL ENGENHAR"], False
    )

    assert situacao == PAGO_AUTOMATICO


def test_trecho_que_nao_aparece_em_nenhuma_saida_deixa_a_pagar():
    # Caso 1: sem nenhuma descrição com o trecho, e sem marca manual, falta pagar
    situacao = situacao_do_fixo(OUTUBRO, OUTUBRO, "CAKTO", ["Padaria"], False)

    assert situacao == A_PAGAR


def test_marcado_a_mao_fica_pago_manual():
    # Caso 1: fixo sem trecho (ou pago em dinheiro) só fica pago se a pessoa
    # marcou
    situacao = situacao_do_fixo(OUTUBRO, OUTUBRO, "", [], True)

    assert situacao == PAGO_MANUAL


def test_trecho_vazio_nunca_casa_sozinho():
    # Caso 1: "" está dentro de qualquer texto; sem esta regra, todo fixo sem
    # trecho apareceria como pago automático
    situacao = situacao_do_fixo(OUTUBRO, OUTUBRO, "", ["Padaria"], False)

    assert situacao == A_PAGAR


def test_mes_antes_do_inicio_nao_comecou():
    # Caso 1: o fixo começa em novembro; em outubro não vale, mesmo que uma
    # saída case com o trecho
    situacao = situacao_do_fixo(OUTUBRO, NOVEMBRO, "CAKTO", ["CAKTO PAY"], False)

    assert situacao == NAO_COMECOU


# Parte 2: as leituras do banco


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


def criar_fixo(nome, valor, mes_inicio=OUTUBRO, trecho=""):
    return GastoFixo.objects.create(
        nome=nome,
        valor=Decimal(valor),
        mes_inicio=mes_inicio,
        trecho_descricao=trecho,
    )


def criar_transacao(conta, descricao, valor, data=date(2026, 10, 5)):
    return Transacao.objects.create(
        conta=conta, data=data, descricao=descricao, valor=Decimal(valor)
    )


def test_situacoes_leem_saidas_da_corrente_e_do_cartao_so_do_mes(corrente, cartao):
    # Caso 1: o trecho vale para saída da corrente e do cartão; não casa com
    # entrada (valor positivo) nem com saída de outro mês
    criar_fixo("Apartamento", "500.00", trecho="DIRECIONAL")
    criar_fixo("Assinatura", "30.00", trecho="YOUTUBE")
    criar_fixo("Internet", "100.00", trecho="CAKTO")
    criar_fixo("Energia", "80.00", trecho="PEDRO FERREIRA")
    criar_transacao(corrente, "PIX DIRECIONAL ENGENHAR", "-500.00")
    criar_transacao(cartao, "Youtube Premium", "-30.00")
    # Entrada com o texto do trecho: dinheiro que entrou, não pagamento
    criar_transacao(corrente, "PIX CAKTO PAY", "100.00")
    # Saída do mês anterior: não paga o mês de outubro
    em_setembro = date(2026, 9, 20)
    criar_transacao(corrente, "PIX PEDRO FERREIRA", "-80.00", data=em_setembro)

    resultado = situacoes_do_mes(OUTUBRO, 0)

    situacoes = {fixo.nome: situacao for fixo, situacao in resultado}
    assert situacoes == {
        "Apartamento": PAGO_AUTOMATICO,
        "Assinatura": PAGO_AUTOMATICO,
        "Internet": A_PAGAR,
        "Energia": A_PAGAR,
    }


def test_situacoes_vem_em_ordem_de_nome_e_leem_o_pago_manual(db):
    # Caso 1: a marca manual vale só para o mês marcado
    internet = criar_fixo("Internet", "100.00")
    criar_fixo("Apartamento", "500.00")
    PagamentoDeGastoFixo.objects.create(gasto=internet, mes=OUTUBRO)

    em_outubro = situacoes_do_mes(OUTUBRO, 0)
    em_novembro = situacoes_do_mes(NOVEMBRO, 0)

    assert [(fixo.nome, situacao) for fixo, situacao in em_outubro] == [
        ("Apartamento", A_PAGAR),
        ("Internet", PAGO_MANUAL),
    ]
    assert [situacao for _, situacao in em_novembro] == [A_PAGAR, A_PAGAR]


def test_total_a_pagar_soma_so_os_a_pagar(corrente):
    # Caso 5: a pagar (300), pago sozinho (200), pago à mão (100) e um que só
    # começa em novembro (70): só os 300 contam
    criar_fixo("Aluguel", "300.00")
    criar_fixo("Internet", "200.00", trecho="CAKTO")
    criar_transacao(corrente, "PIX CAKTO PAY", "-200.00")
    luz = criar_fixo("Luz", "100.00")
    PagamentoDeGastoFixo.objects.create(gasto=luz, mes=OUTUBRO)
    criar_fixo("Água", "70.00", mes_inicio=NOVEMBRO)

    assert total_a_pagar(OUTUBRO, 0) == Decimal("300.00")
    assert total_a_pagar(SETEMBRO, 0) == Decimal("0.00")


def test_total_previsto_soma_todos_que_ja_comecaram(db):
    # Caso 7: em novembro contam todos os que começam até novembro; o de
    # dezembro não
    criar_fixo("Aluguel", "300.00")
    criar_fixo("Água", "70.00", mes_inicio=NOVEMBRO)
    criar_fixo("Seguro", "50.00", mes_inicio=date(2026, 12, 1))

    assert total_previsto(NOVEMBRO) == Decimal("370.00")
    assert total_previsto(SETEMBRO) == Decimal("0.00")
