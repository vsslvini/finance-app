import math
from decimal import Decimal

# Contas da seção "Guardado" do resumo (RF04, RF28 e RF29). Funções puras:
# recebem números e datas e devolvem números, sem banco e sem relógio. Quem
# busca o total e o "este mês" no banco é o resumo_do_mes


def meses_ate(mes, mes_alvo):
    # Conta o mês de agora e o mês alvo (outubro de 2026 a julho de 2027 são 10
    # meses); se o alvo já passou, não sobra nenhum
    meses = (mes_alvo.year - mes.year) * 12 + (mes_alvo.month - mes.month) + 1
    return max(meses, 0)


def bloco_guardado(total, este_mes, mes, valor_mensal=None, mes_alvo=None):
    # O plano vale só com os dois preenchidos (a API não deixa salvar só um)
    if valor_mensal is None or mes_alvo is None:
        return {
            "total": total,
            "este_mes": este_mes,
            "plano": None,
            "previsto": None,
            "progresso": None,
            "falta_guardar_no_mes": Decimal("0.00"),
        }

    meses = meses_ate(mes, mes_alvo)
    # Mês já guardado: o dinheiro dele já está no total, então não entra de novo
    if meses > 0 and este_mes >= valor_mensal:
        meses -= 1
    previsto = total + valor_mensal * meses

    # Em %, arredondado para baixo; sem previsto não há o que dividir
    progresso = None
    if previsto != 0:
        progresso = math.floor(total * 100 / previsto)

    return {
        "total": total,
        "este_mes": este_mes,
        "plano": {"valor_mensal": valor_mensal, "mes_alvo": mes_alvo},
        "previsto": previsto,
        "progresso": progresso,
        # Guardou mais do que o plano: não falta nada (e não vira negativo)
        "falta_guardar_no_mes": max(Decimal("0.00"), valor_mensal - este_mes),
    }
