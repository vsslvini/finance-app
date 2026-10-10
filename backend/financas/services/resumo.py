from decimal import ROUND_FLOOR, Decimal

from django.db.models import Q, Sum

from financas.models import Conta, Transacao
from financas.services.periodo import mes_atual, periodo_do_mes

# Categorias da Pluggy que não são gasto nem ganho de verdade, num lugar só:
# dinheiro indo de uma conta minha para outra minha (PIX, TED...)
TRANSFERENCIA_PROPRIA = Q(categoria_pluggy__startswith="Same person transfer")
# Pagar a fatura não é gasto novo: as compras já contaram no cartão
PAGAMENTO_DE_FATURA = Q(categoria_pluggy="Credit card payment")
NAO_E_GASTO = TRANSFERENCIA_PROPRIA | PAGAMENTO_DE_FATURA

ZERO = Decimal("0.00")


def somar(queryset, campo):
    # Sum de nenhuma linha dá None; o resumo mostra 0.00 nesse caso
    return queryset.aggregate(total=Sum(campo))["total"] or ZERO


def resumo_do_mes(mes, hoje, dias_antes=0, limite=None):
    # "hoje" vem de fora para os testes fixarem o dia sem trocar o relógio.
    # dias_antes e limite também vêm de fora (a view lê da Configuracao), para
    # os testes não precisarem salvar configuração no banco
    inicio, fim = periodo_do_mes(mes.year, mes.month, dias_antes)
    # range inclui as duas pontas: inicio <= data <= fim
    transacoes_do_mes = Transacao.objects.filter(data__range=(inicio, fim))
    gastos = transacoes_do_mes.filter(valor__lt=0).exclude(NAO_E_GASTO)

    # Cartão fica fora do saldo: o "saldo" do cartão é a fatura
    saldo_total = somar(Conta.objects.filter(tipo=Conta.Tipo.CORRENTE), "saldo")
    fatura_aberta = somar(Conta.objects.filter(tipo=Conta.Tipo.CARTAO), "saldo")
    # Só corrente: positivo no cartão é estorno ou pagamento, não dinheiro novo
    correntes_do_mes = transacoes_do_mes.filter(conta__tipo=Conta.Tipo.CORRENTE)
    entradas = somar(
        correntes_do_mes.filter(valor__gt=0).exclude(TRANSFERENCIA_PROPRIA), "valor"
    )
    # abs: as saídas são negativas no banco, mas o app mostra o valor positivo
    saidas = abs(somar(gastos, "valor"))

    # Os três só fazem sentido no mês de hoje; nos outros meses ficam None
    posso_gastar_por_dia = None
    dia_do_mes = None
    dias_no_mes = None
    if (mes.year, mes.month) == mes_atual(hoje, dias_antes):
        # +1 nas três contas: o primeiro e o último dia também contam
        # (ex.: de 29/09 a 29/10 são 31 dias, e 10/10 é o dia 12)
        dias_no_mes = (fim - inicio).days + 1
        dia_do_mes = (hoje - inicio).days + 1
        # No último dia ainda sobra 1 dia, então não há divisão por zero
        dias_restantes = (fim - hoje).days + 1
        # A fatura não é descontada: ela é paga com o salário do mês seguinte.
        # ROUND_FLOOR arredonda para baixo, inclusive nos negativos, para nunca
        # sugerir gastar mais do que se tem
        posso_gastar_por_dia = (saldo_total / dias_restantes).quantize(
            Decimal("0.01"), rounding=ROUND_FLOOR
        )

    # data <= hoje: parcelas futuras já aparecem no mês, mas ainda não foram gastas
    ultimos_gastos = list(
        gastos.filter(data__lte=hoje)
        .select_related("conta__conexao")
        .order_by("-data", "-id")[:5]
    )

    return {
        # "2026-10": o app mostra de qual mês é o resumo, mesmo sem ?mes=
        "mes": mes.strftime("%Y-%m"),
        "dia_do_mes": dia_do_mes,
        "dias_no_mes": dias_no_mes,
        "saldo_total": saldo_total,
        "fatura_aberta": fatura_aberta,
        "entradas": entradas,
        "saidas": saidas,
        "posso_gastar_por_dia": posso_gastar_por_dia,
        "ultimos_gastos": ultimos_gastos,
        # None = sem limite; aí nunca avisa
        "limite_fatura": limite,
        "fatura_acima_do_limite": limite is not None and fatura_aberta > limite,
    }
