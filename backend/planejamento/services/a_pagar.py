from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Sum

from financas.services.periodo import mes_atual
from planejamento.models import ParcelaDaDivida
from planejamento.services import dividas, gastos_fixos

# O planejamento por mês da aba "A pagar" (Módulo 17): para cada mês, quanto
# se paga de gastos fixos e de parcelas de dívida, e quanto ainda falta pagar

ZERO = Decimal("0.00")


def percentual_da_renda(total, renda):
    # total ÷ renda × 100, com uma casa (38,6746 vira 38,7). None quando não
    # há renda informada, ou ela é zero (não dá para dividir)
    if not renda:
        return None
    return (total / renda * 100).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def total_das_parcelas(mes):
    # Todas as parcelas do mês (dia 1), pagas ou não: é o custo do mês
    soma = ParcelaDaDivida.objects.filter(mes=mes).aggregate(total=Sum("valor"))
    return soma["total"] or ZERO


def meses_a_pagar(hoje, dias_antes, quantos=6):
    # O mês atual do app e os seguintes, em ordem. Não inclui a % da renda
    # (quem chama calcula, porque a renda mora nas configurações)
    ano, numero = mes_atual(hoje, dias_antes)
    atual = date(ano, numero, 1)

    meses = []
    for posicao in range(quantos):
        mes = dividas.somar_meses(atual, posicao)
        fixos = gastos_fixos.total_previsto(mes)
        parcelas = total_das_parcelas(mes)
        # No mês atual, os fixos já pagos saem do "falta" (mesma regra do gasto
        # previsto). Nos seguintes nada foi pago ainda: faltam todos. As
        # parcelas atrasadas ficam de fora, para o "falta" nunca passar do total
        falta_fixos = (
            gastos_fixos.total_a_pagar(mes, dias_antes) if posicao == 0 else fixos
        )
        meses.append(
            {
                "mes": mes,
                "fixos": fixos,
                "dividas": parcelas,
                "total": fixos + parcelas,
                "falta": falta_fixos + dividas.total_do_mes(mes),
            }
        )
    return meses
