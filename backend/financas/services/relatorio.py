from django.db.models import Q

from financas.models import Conta
from financas.services.periodo import periodo_do_mes
from financas.services.resumo import (
    NAO_E_GASTO,
    ZERO,
    entradas_e_saidas,
    transacoes_do_periodo,
)

# A Pluggy marca alguns pagamentos de fatura da corrente como "Transfers" (ex.:
# "Pagamento efetuado - Pagamento Fatura - ..."). Eles repetiriam as compras do
# cartão, que já contam como gasto. Só vale na corrente: no cartão, "fatura" na
# descrição é uma compra comum
FATURA_PAGA_NA_CORRENTE = Q(
    conta__tipo=Conta.Tipo.CORRENTE, descricao__icontains="fatura"
)


def relatorio_do_mes(
    mes, dias_antes=0, traducoes=None, dividas_do_mes=ZERO, fixos_do_mes=ZERO
):
    # traducoes ({"Groceries": "Mercado"}) vem da view, que já as lê para os
    # maiores gastos; assim os testes não precisam salvar categorias no banco.
    # dividas_do_mes (parcelas não pagas do mês) e fixos_do_mes (gastos fixos a
    # pagar do mês) também vêm da view, como no resumo
    traducoes = traducoes or {}
    inicio, fim = periodo_do_mes(mes.year, mes.month, dias_antes)
    # Com a categoria_efetiva anotada, que as regras do resumo usam
    transacoes_do_mes = transacoes_do_periodo(inicio, fim)
    # A mesma regra do resumo, para o relatório bater com a tela Início
    entradas, saidas = entradas_e_saidas(transacoes_do_mes)
    saidas += dividas_do_mes + fixos_do_mes

    # Gastos contam a corrente e o cartão: o relatório mostra o que foi
    # consumido. Uma consulta só, já do maior para o menor ("valor" sobe, e o
    # gasto mais negativo é o maior); "-id" desempata valores iguais
    gastos = list(
        transacoes_do_mes.filter(valor__lt=0)
        .exclude(NAO_E_GASTO)
        .exclude(FATURA_PAGA_NA_CORRENTE)
        .select_related("conta__conexao")
        .order_by("valor", "-id")
    )
    # "- gasto.valor": o gasto é negativo no banco, e o relatório mostra positivo.
    # As parcelas não pagas e os fixos a pagar do mês também são gasto do mês
    total_gastos = sum((-gasto.valor for gasto in gastos), ZERO)
    total_gastos += dividas_do_mes + fixos_do_mes

    # Agrupa em Python, em cima da lista que já veio do banco (sem uma consulta
    # por transação). A chave é a categoria exibida: manual, senão Pluggy,
    # senão "Sem categoria"
    grupos = {}
    for gasto in gastos:
        exibida = gasto.categoria_exibida
        if exibida not in grupos:
            grupos[exibida] = {
                "categoria": traducoes.get(exibida, exibida),
                # Igual ao da lista de transações: "" quando não há categoria
                "categoria_original": gasto.categoria_manual or gasto.categoria_pluggy,
                "total": ZERO,
            }
        grupos[exibida]["total"] -= gasto.valor

    linhas = list(grupos.values())
    # As parcelas viram uma linha à parte (não são transações, então não entram
    # nos maiores gastos). Sem parcelas no mês, não aparece uma linha zerada
    if dividas_do_mes > 0:
        linhas.append(
            {"categoria": "Dívidas", "categoria_original": "", "total": dividas_do_mes}
        )
    if fixos_do_mes > 0:
        linhas.append(
            {
                "categoria": "Gastos fixos",
                "categoria_original": "",
                "total": fixos_do_mes,
            }
        )

    # Maior total primeiro; no empate, o nome mostrado
    gastos_por_categoria = sorted(
        linhas, key=lambda grupo: (-grupo["total"], grupo["categoria"])
    )
    # Sem gastos a lista está vazia e o laço não roda, então não há divisão por
    # zero. "//" é a divisão inteira, que arredonda para baixo
    for grupo in gastos_por_categoria:
        grupo["porcentagem"] = int(grupo["total"] * 100 // total_gastos)

    return {
        "mes": mes.strftime("%Y-%m"),
        "entradas": entradas,
        "saidas": saidas,
        "saldo_do_mes": entradas - saidas,
        "total_gastos": total_gastos,
        "gastos_por_categoria": gastos_por_categoria,
        "maiores_gastos": gastos[:5],
    }
