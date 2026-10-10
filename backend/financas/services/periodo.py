from datetime import date, timedelta

# O "mês do app" pode começar alguns dias antes do dia 1 (RF30). Funções puras:
# recebem datas e números e devolvem datas, sem banco e sem relógio


def periodo_do_mes(ano, mes, dias_antes):
    # Devolve (inicio, fim) do mês do app; o fim também faz parte do mês
    primeiro_dia = date(ano, mes, 1)
    if mes == 12:
        primeiro_do_seguinte = date(ano + 1, 1, 1)
    else:
        primeiro_do_seguinte = date(ano, mes + 1, 1)
    inicio = primeiro_dia - timedelta(days=dias_antes)
    # +1: o fim é a véspera do início do mês seguinte
    fim = primeiro_do_seguinte - timedelta(days=dias_antes + 1)
    return inicio, fim


def mes_atual(hoje, dias_antes):
    # Andar "dias_antes" para a frente cai no mês do calendário que corresponde
    # ao mês do app (ex.: 2 dias antes, 30/10 + 2 = 01/11, então é novembro)
    dia = hoje + timedelta(days=dias_antes)
    return dia.year, dia.month
