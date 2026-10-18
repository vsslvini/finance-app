from datetime import date

from financas.models import Conta
from financas.services.periodo import mes_atual
from planejamento.services import dividas, gastos_fixos

# O "gasto previsto" (RF33, Módulo 14): quanto ainda vai ser pago no mês atual
# do app e no mês que vem. mes_da_fatura é pura (sem banco); calcular_previsto
# junta fixos, dívidas e faturas


def mes_da_fatura(hoje, dias_antes, data_vencimento):
    # Em que mês (dia 1, no mês do app) a fatura aberta de um cartão vence.
    # Vencimento de hoje em diante: o mês do app dessa data. Vencimento no
    # passado ou vazio: a Pluggy não atualizou a data, e a fatura aberta é a
    # seguinte, então vence no mês que vem. Limite conhecido: entre o
    # fechamento e o vencimento, com a data velha, cai no mês errado
    if data_vencimento is not None and data_vencimento >= hoje:
        ano, mes = mes_atual(data_vencimento, dias_antes)
        return date(ano, mes, 1)
    ano, mes = mes_atual(hoje, dias_antes)
    return dividas.somar_meses(date(ano, mes, 1), 1)


def faturas_por_mes(hoje, dias_antes, meses):
    # {mês: [fatura, ...]} só para os meses pedidos. Cartão sem fatura (saldo
    # zero) fica de fora, porque não há o que pagar
    faturas = {mes: [] for mes in meses}
    cartoes = (
        Conta.objects.filter(tipo=Conta.Tipo.CARTAO, saldo__gt=0)
        .select_related("conexao")
        .order_by("conexao__nome_banco", "nome")
    )
    for cartao in cartoes:
        mes = mes_da_fatura(hoje, dias_antes, cartao.data_vencimento)
        if mes in faturas:
            faturas[mes].append(
                {
                    "conta": cartao.id,
                    "nome_banco": cartao.conexao.nome_banco,
                    "nome_conta": cartao.nome,
                    "valor": cartao.saldo,
                }
            )
    return faturas


def calcular_previsto(hoje, dias_antes):
    ano, numero = mes_atual(hoje, dias_antes)
    atual = date(ano, numero, 1)
    proximo = dividas.somar_meses(atual, 1)
    faturas = faturas_por_mes(hoje, dias_antes, [atual, proximo])

    # Mês atual: só o que ainda falta pagar (fixos a pagar, parcelas não pagas
    # do mês e as atrasadas)
    fixos_atual = gastos_fixos.total_a_pagar(atual, dias_antes)
    dividas_atual = dividas.total_do_mes(atual)
    atrasadas = dividas.total_atrasadas(atual)
    total_atual = (
        sum((fatura["valor"] for fatura in faturas[atual]), gastos_fixos.ZERO)
        + fixos_atual
        + dividas_atual
        + atrasadas
    )

    # Mês que vem: nada foi pago ainda, então todos os fixos que já começaram
    fixos_proximo = gastos_fixos.total_previsto(proximo)
    dividas_proximo = dividas.total_do_mes(proximo)
    total_proximo = (
        sum((fatura["valor"] for fatura in faturas[proximo]), gastos_fixos.ZERO)
        + fixos_proximo
        + dividas_proximo
    )

    return {
        "mes_atual": {
            "mes": atual.strftime("%Y-%m"),
            "total": total_atual,
            "faturas": faturas[atual],
            "fixos": fixos_atual,
            "dividas": dividas_atual,
            "atrasadas": atrasadas,
        },
        "proximo_mes": {
            "mes": proximo.strftime("%Y-%m"),
            "total": total_proximo,
            "faturas": faturas[proximo],
            "fixos": fixos_proximo,
            "dividas": dividas_proximo,
        },
    }
