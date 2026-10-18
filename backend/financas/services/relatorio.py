from django.db.models import Q

from financas.models import Conta, Transacao
from financas.services.periodo import periodo_do_mes
from financas.services.resumo import NAO_E_GASTO, ZERO, entradas_e_saidas

# A Pluggy marca alguns pagamentos de fatura da corrente como "Transfers" (ex.:
# "Pagamento efetuado - Pagamento Fatura - ..."). Eles repetiriam as compras do
# cartão, que já contam como gasto. Só vale na corrente: no cartão, "fatura" na
# descrição é uma compra comum
FATURA_PAGA_NA_CORRENTE = Q(
    conta__tipo=Conta.Tipo.CORRENTE, descricao__icontains="fatura"
)


def relatorio_do_mes(mes, dias_antes=0, traducoes=None):
    # traducoes ({"Groceries": "Mercado"}) vem da view, que já as lê para os
    # maiores gastos; assim os testes não precisam salvar categorias no banco
    traducoes = traducoes or {}
    inicio, fim = periodo_do_mes(mes.year, mes.month, dias_antes)
    transacoes_do_mes = Transacao.objects.filter(data__range=(inicio, fim))
    # A mesma regra do resumo, para o relatório bater com a tela Início
    entradas, saidas = entradas_e_saidas(transacoes_do_mes)

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
    # "- gasto.valor": o gasto é negativo no banco, e o relatório mostra positivo
    total_gastos = sum((-gasto.valor for gasto in gastos), ZERO)

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

    # Maior total primeiro; no empate, o nome mostrado
    gastos_por_categoria = sorted(
        grupos.values(), key=lambda grupo: (-grupo["total"], grupo["categoria"])
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
