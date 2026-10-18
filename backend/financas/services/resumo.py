from decimal import ROUND_FLOOR, Decimal

from django.db.models import Max, Q, Sum, Value
from django.db.models.functions import Coalesce, NullIf

from financas.models import Conexao, Conta, Investimento, Transacao
from financas.services.guardado import bloco_guardado
from financas.services.periodo import mes_atual, periodo_do_mes

# As regras abaixo comparam a categoria efetiva: a manual, se o Vinicius trocou;
# senão a da Pluggy (decidido no Módulo 11). Assim, marcar uma transação como
# transferência própria ou investimento muda as contas. NullIf transforma a
# manual vazia ("") em NULL, para o Coalesce pular para a da Pluggy
CATEGORIA_EFETIVA = Coalesce(NullIf("categoria_manual", Value("")), "categoria_pluggy")

# Categorias da Pluggy que não são gasto nem ganho de verdade, num lugar só:
# dinheiro indo de uma conta minha para outra minha (Cash, PIX, TED...)
TRANSFERENCIA_PROPRIA = Q(categoria_efetiva__startswith="Same person transfer")
PAGAMENTO_DE_FATURA = Q(categoria_efetiva="Credit card payment")
# Aplicar ou resgatar é guardar ou tirar o próprio dinheiro, não gastar nem
# ganhar. Nomes da árvore de categorias da Pluggy (grupo "Investments"), menos
# "Proceeds interests and dividends": juros e dividendos são ganho de verdade
INVESTIMENTO = Q(
    categoria_efetiva__in=[
        "Investments",
        "Automatic investment",
        "Fixed income",
        "Mutual funds",
        "Variable income",
        "Margin",
        "Pension",
    ]
)
# Fora de entradas e saidas: o dinheiro só trocou de lugar
NAO_CONTA_NO_MES = TRANSFERENCIA_PROPRIA | INVESTIMENTO
# Fora dos últimos gastos: o pagamento da fatura repetiria as compras do cartão,
# que já aparecem na lista
NAO_E_GASTO = NAO_CONTA_NO_MES | PAGAMENTO_DE_FATURA

ZERO = Decimal("0.00")


def somar(queryset, campo):
    # Sum de nenhuma linha dá None; o resumo mostra 0.00 nesse caso
    return queryset.aggregate(total=Sum(campo))["total"] or ZERO


def transacoes_do_periodo(inicio, fim):
    # As regras acima só funcionam num queryset com a categoria_efetiva
    # anotada; o resumo e o relatório buscam as transações do mês por aqui.
    # range inclui as duas pontas: inicio <= data <= fim
    return Transacao.objects.filter(data__range=(inicio, fim)).annotate(
        categoria_efetiva=CATEGORIA_EFETIVA
    )


def entradas_e_saidas(transacoes_do_mes):
    # transacoes_do_mes vem de transacoes_do_periodo (com a categoria_efetiva)
    # Entradas e saidas contam só pela conta corrente (decidido em 2026-10-10, no
    # lugar da regra de 2026-10-08, que contava as compras do cartão e não o
    # pagamento da fatura). Assim o pagamento da fatura conta no mês em que é
    # pago, porque a fatura é paga com o salário seguinte; as compras do cartão
    # ficam só na fatura_aberta. No cartão, positivo é estorno, não dinheiro novo.
    # Função à parte porque o relatório do mês usa a mesma regra
    correntes = transacoes_do_mes.filter(conta__tipo=Conta.Tipo.CORRENTE)
    correntes = correntes.exclude(NAO_CONTA_NO_MES)
    entradas = somar(correntes.filter(valor__gt=0), "valor")
    # abs: as saídas são negativas no banco, mas o app mostra o valor positivo
    saidas = abs(somar(correntes.filter(valor__lt=0), "valor"))
    return entradas, saidas


def resumo_do_mes(
    mes,
    hoje,
    dias_antes=0,
    limite=None,
    valor_mensal=None,
    mes_alvo=None,
    dividas_do_mes=ZERO,
    dividas_atrasadas=ZERO,
):
    # "hoje" vem de fora para os testes fixarem o dia sem trocar o relógio.
    # dias_antes e limite também vêm de fora (a view lê da Configuracao), para
    # os testes não precisarem salvar configuração no banco. Pelo mesmo motivo,
    # valor_mensal e mes_alvo (o plano de guardar) vêm de fora, None sem plano,
    # e também as dívidas (Módulo 12): dividas_do_mes é a soma das parcelas não
    # pagas deste mês, e dividas_atrasadas, a das não pagas de meses antes do
    # mês atual do app
    inicio, fim = periodo_do_mes(mes.year, mes.month, dias_antes)
    transacoes_do_mes = transacoes_do_periodo(inicio, fim)
    gastos = transacoes_do_mes.filter(valor__lt=0).exclude(NAO_E_GASTO)

    # Cartão fica fora do saldo: o "saldo" do cartão é a fatura
    saldo_total = somar(Conta.objects.filter(tipo=Conta.Tipo.CORRENTE), "saldo")
    fatura_aberta = somar(Conta.objects.filter(tipo=Conta.Tipo.CARTAO), "saldo")
    correntes_do_mes = transacoes_do_mes.filter(conta__tipo=Conta.Tipo.CORRENTE)

    # Guardado: todos os investimentos contam (decidido em 2026-10-10). Este mês
    # = aplicações - resgates na corrente, pelas mesmas categorias que ficam fora
    # de entradas e saidas. Aplicação é saída (negativa), por isso o sinal
    # trocado; "ZERO -" em vez de "-" para não aparecer "-0.00" sem nenhuma
    total_guardado = somar(Investimento.objects.all(), "saldo")
    guardado_este_mes = ZERO - somar(correntes_do_mes.filter(INVESTIMENTO), "valor")
    guardado = bloco_guardado(
        total_guardado, guardado_este_mes, mes, valor_mensal, mes_alvo
    )

    entradas, saidas = entradas_e_saidas(transacoes_do_mes)
    # A parcela não paga é uma saída do mês dela; quando for paga de verdade (um
    # PIX), ela deixa de contar aqui, e o PIX já entra pelas transações
    saidas += dividas_do_mes

    e_o_mes_atual = (mes.year, mes.month) == mes_atual(hoje, dias_antes)
    # Atrasadas só fazem sentido olhando o mês atual
    if not e_o_mes_atual:
        dividas_atrasadas = ZERO

    # Os três só fazem sentido no mês de hoje; nos outros meses ficam None
    posso_gastar_por_dia = None
    dia_do_mes = None
    dias_no_mes = None
    if e_o_mes_atual:
        # +1 nas três contas: o primeiro e o último dia também contam
        # (ex.: de 29/09 a 29/10 são 31 dias, e 10/10 é o dia 12)
        dias_no_mes = (fim - inicio).days + 1
        dia_do_mes = (hoje - inicio).days + 1
        # No último dia ainda sobra 1 dia, então não há divisão por zero
        dias_restantes = (fim - hoje).days + 1
        # A fatura não é descontada: ela é paga com o salário do mês seguinte.
        # O que falta guardar no mês é descontado (RF29): já tem destino. As
        # parcelas não pagas do mês e as atrasadas também: o dinheiro já está
        # comprometido (Módulo 12).
        # ROUND_FLOOR arredonda para baixo, inclusive nos negativos, para nunca
        # sugerir gastar mais do que se tem
        disponivel = (
            saldo_total
            - guardado["falta_guardar_no_mes"]
            - dividas_do_mes
            - dividas_atrasadas
        )
        posso_gastar_por_dia = (disponivel / dias_restantes).quantize(
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
        "guardado": guardado,
        "dividas_do_mes": dividas_do_mes,
        # 0.00 quando o resumo não é do mês atual
        "dividas_atrasadas": dividas_atrasadas,
        # Quando o nosso backend leu a Pluggy pela última vez (a conexão mais
        # recente); None se nunca sincronizou. O app mostra "Atualizado ..."
        "ultima_atualizacao": Conexao.objects.aggregate(
            ultima=Max("ultima_atualizacao")
        )["ultima"],
    }
