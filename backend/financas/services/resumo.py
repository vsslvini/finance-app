import calendar
from decimal import ROUND_FLOOR, Decimal

from django.db.models import Q, Sum

from financas.models import Conta, Transacao

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


def resumo_do_mes(mes, hoje):
    # "hoje" vem de fora para os testes fixarem o dia sem trocar o relógio
    transacoes_do_mes = Transacao.objects.filter(
        data__year=mes.year, data__month=mes.month
    )
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

    posso_gastar_por_dia = None
    if (mes.year, mes.month) == (hoje.year, hoje.month):
        ultimo_dia = calendar.monthrange(hoje.year, hoje.month)[1]
        # +1: o dia de hoje também conta, então no dia 31 ainda sobra 1 dia
        dias_restantes = ultimo_dia - hoje.day + 1
        # ROUND_FLOOR arredonda para baixo, inclusive nos negativos, para nunca
        # sugerir gastar mais do que se tem
        sobra = saldo_total - fatura_aberta
        posso_gastar_por_dia = (sobra / dias_restantes).quantize(
            Decimal("0.01"), rounding=ROUND_FLOOR
        )

    # data <= hoje: parcelas futuras já aparecem no mês, mas ainda não foram gastas
    ultimos_gastos = list(
        gastos.filter(data__lte=hoje)
        .select_related("conta__conexao")
        .order_by("-data", "-id")[:5]
    )

    return {
        "saldo_total": saldo_total,
        "fatura_aberta": fatura_aberta,
        "entradas": entradas,
        "saidas": saidas,
        "posso_gastar_por_dia": posso_gastar_por_dia,
        "ultimos_gastos": ultimos_gastos,
    }
