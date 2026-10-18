from datetime import date
from decimal import ROUND_FLOOR, Decimal

from django.db import transaction
from django.db.models import Sum

from planejamento.models import Divida, ParcelaDaDivida

# Regras das dívidas (RF21, Módulo 12). gerar_parcelas é pura (sem banco); as
# outras funções leem ou gravam os models

ZERO = Decimal("0.00")


def somar_meses(mes, quantidade):
    # Dia 1 do mês "quantidade" meses depois (novembro + 2 = janeiro do ano
    # seguinte). Conta os meses desde o ano 0 para a virada do ano sair sozinha
    total = mes.year * 12 + (mes.month - 1) + quantidade
    return date(total // 12, total % 12 + 1, 1)


def gerar_parcelas(valor_total, quantidade, mes_inicio):
    # Valor total ÷ parcelas, arredondado para baixo no centavo; a última leva
    # a sobra, para a soma das parcelas dar o valor total exato
    # (1000 em 3x = 333,33 + 333,33 + 333,34)
    valor = (valor_total / quantidade).quantize(Decimal("0.01"), rounding=ROUND_FLOOR)
    ultima = valor_total - valor * (quantidade - 1)
    return [
        {
            "numero": numero,
            "mes": somar_meses(mes_inicio, numero - 1),
            "valor": ultima if numero == quantidade else valor,
        }
        for numero in range(1, quantidade + 1)
    ]


# atomic: a dívida e as parcelas são gravadas juntas; se algo falhar no meio,
# nada fica salvo (nunca uma dívida sem parcelas)
@transaction.atomic
def criar_divida(credor, motivo, valor_total, parcelas, mes_inicio):
    divida = Divida.objects.create(
        credor=credor,
        motivo=motivo,
        valor_total=valor_total,
        total_parcelas=parcelas,
        mes_inicio=mes_inicio,
    )
    # bulk_create: um INSERT só para todas as parcelas
    ParcelaDaDivida.objects.bulk_create(
        ParcelaDaDivida(divida=divida, **parcela)
        for parcela in gerar_parcelas(valor_total, parcelas, mes_inicio)
    )
    return divida


def somar_nao_pagas(**filtro):
    # Sum de nenhuma linha dá None; aqui vira 0.00, como no resumo
    parcelas = ParcelaDaDivida.objects.filter(paga=False, **filtro)
    return parcelas.aggregate(total=Sum("valor"))["total"] or ZERO


def total_do_mes(mes):
    # Parcelas não pagas do mês (dia 1): contam nas saídas desse mês
    return somar_nao_pagas(mes=mes)


def total_atrasadas(mes_atual):
    # Parcelas não pagas de meses antes do mês atual do app (dia 1): já eram
    # do mês delas, mas o dinheiro continua comprometido
    return somar_nao_pagas(mes__lt=mes_atual)
