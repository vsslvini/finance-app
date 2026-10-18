from decimal import Decimal

from django.db.models import Sum

from financas.services.periodo import periodo_do_mes
from financas.services.resumo import transacoes_do_periodo
from planejamento.models import GastoFixo, PagamentoDeGastoFixo

# Regras dos gastos fixos (RF32, Módulo 14). situacao_do_fixo é pura (sem
# banco); as outras funções leem os models e as transações do mês

ZERO = Decimal("0.00")

PAGO_AUTOMATICO = "pago_automatico"
PAGO_MANUAL = "pago_manual"
A_PAGAR = "a_pagar"
NAO_COMECOU = "nao_comecou"


def situacao_do_fixo(mes, mes_inicio, trecho, descricoes_das_saidas, pago_manual):
    # mes e mes_inicio são o dia 1 do mês. descricoes_das_saidas são os textos
    # das saídas (corrente e cartão) do mês, e pago_manual diz se a pessoa
    # marcou este mês à mão
    if mes < mes_inicio:
        return NAO_COMECOU
    # Sem trecho (""), nada casa: "" está dentro de qualquer texto, então a
    # checagem de vazio precisa vir antes. lower() nos dois lados ignora
    # maiúsculas
    trecho = trecho.lower()
    if trecho and any(trecho in texto.lower() for texto in descricoes_das_saidas):
        return PAGO_AUTOMATICO
    if pago_manual:
        return PAGO_MANUAL
    return A_PAGAR


def descricoes_das_saidas(mes, dias_antes):
    # Só as saídas (valor negativo) do mês do app. Usa as mesmas funções do
    # resumo para o período, sem repetir a regra do mês
    inicio, fim = periodo_do_mes(mes.year, mes.month, dias_antes)
    saidas = transacoes_do_periodo(inicio, fim).filter(valor__lt=0)
    return list(saidas.values_list("descricao", flat=True))


def situacoes_do_mes(mes, dias_antes):
    # Lista de (gasto fixo, situação) no mês pedido, em ordem de nome
    fixos = list(GastoFixo.objects.order_by("nome", "id"))
    if not fixos:
        return []
    pagos_a_mao = set(
        PagamentoDeGastoFixo.objects.filter(mes=mes).values_list("gasto_id", flat=True)
    )
    descricoes = descricoes_das_saidas(mes, dias_antes)
    return [
        (
            fixo,
            situacao_do_fixo(
                mes,
                fixo.mes_inicio,
                fixo.trecho_descricao,
                descricoes,
                fixo.id in pagos_a_mao,
            ),
        )
        for fixo in fixos
    ]


def total_a_pagar(mes, dias_antes):
    # Soma dos fixos "a pagar" do mês: contam nas saídas desse mês. Os pagos
    # não contam, porque o pagamento de verdade já está nas transações
    situacoes = situacoes_do_mes(mes, dias_antes)
    a_pagar = (fixo.valor for fixo, situacao in situacoes if situacao == A_PAGAR)
    return sum(a_pagar, ZERO)


def total_previsto(mes):
    # Todos os fixos que já começaram no mês (dia 1), pelo valor previsto: é o
    # que se espera pagar num mês que ainda não chegou
    soma = GastoFixo.objects.filter(mes_inicio__lte=mes).aggregate(total=Sum("valor"))
    return soma["total"] or ZERO
