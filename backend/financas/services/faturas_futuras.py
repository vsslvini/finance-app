import re
from decimal import Decimal

from financas.models import Conta, Transacao
from financas.services.periodo import mes_atual

# Estimativa das próximas faturas do cartão pelas compras parceladas (RF13).
# A Pluggy manda cada parcela só no mês em que ela é cobrada, então as faturas
# futuras são projetadas a partir da última parcela vista de cada compra

MESES_FUTUROS = 6
ZERO = Decimal("0.00")
# " 2/6" no fim da descrição (a Pluggy às vezes manda, às vezes não); \s+ exige
# o espaço antes, e $ prende no fim, para não tirar um "2/6" do meio do texto
SUFIXO_PARCELA = re.compile(r"\s+\d+/\d+\s*$")


def descricao_sem_parcela(descricao):
    return SUFIXO_PARCELA.sub("", descricao).strip()


def somar_meses(ano, mes, quantos):
    # Conta os meses numa linha só (ano x 12 + mês) para a virada de ano sair
    # certa: dezembro de 2026 + 1 = janeiro de 2027
    novo_ano, indice = divmod(ano * 12 + (mes - 1) + quantos, 12)
    return novo_ano, indice + 1


def parcela_valida(transacao):
    # Só compra (negativo) com parcela que faz sentido: fica de fora o estorno
    # e o ruído de renegociação, como "parcela 3 de 1"
    return (
        transacao.valor < 0
        and transacao.parcela_atual is not None
        and transacao.total_parcelas is not None
        and 1 <= transacao.parcela_atual <= transacao.total_parcelas
    )


def projetar_parcelas(transacoes, ano, mes):
    # Função pura: recebe as transações de cartão (qualquer objeto com os campos
    # da Transacao) e o mês atual do app; devolve os 6 meses seguintes, cada um
    # com o total e o total por conta ({id da conta: total}). Sem banco
    ultimas = {}
    for transacao in transacoes:
        if not parcela_valida(transacao):
            continue
        # Parcelas da mesma compra têm tudo igual, menos a parcela, a data e o
        # " X/Y" da descrição
        serie = (
            transacao.conta_id,
            transacao.total_parcelas,
            transacao.valor,
            descricao_sem_parcela(transacao.descricao),
        )
        vista = ultimas.get(serie)
        # Fica a maior parcela; no empate, a data mais recente (tuplas são
        # comparadas item a item: primeiro a parcela, depois a data)
        posicao = (transacao.parcela_atual, transacao.data)
        if vista is None or posicao > (vista.parcela_atual, vista.data):
            ultimas[serie] = transacao

    # Os 6 meses já entram zerados (sem nenhuma conta), na ordem
    meses = {}
    for quantos in range(1, MESES_FUTUROS + 1):
        meses[somar_meses(ano, mes, quantos)] = {}

    for ultima in ultimas.values():
        # A parcela a de n, no mês M, cobra a, a+1, ..., n em M, M+1, ..., M+(n-a)
        restantes = ultima.total_parcelas - ultima.parcela_atual + 1
        for quantos in range(restantes):
            chave = somar_meses(ultima.data.year, ultima.data.month, quantos)
            # Meses passados, o atual e os depois dos 6 ficam de fora
            if chave in meses:
                por_conta = meses[chave]
                ja_somado = por_conta.get(ultima.conta_id, ZERO)
                # abs: a compra é negativa no banco, mas a fatura é mostrada
                # em valor positivo
                por_conta[ultima.conta_id] = ja_somado + abs(ultima.valor)

    return [
        {
            "mes": f"{ano_do_mes}-{numero_do_mes:02d}",
            "total": sum(por_conta.values(), ZERO),
            "por_conta": por_conta,
        }
        for (ano_do_mes, numero_do_mes), por_conta in meses.items()
    ]


def estimar_faturas(hoje, dias_antes=0):
    # "hoje" e dias_antes vêm de fora, como no resumo_do_mes: a view lê a
    # Configuracao, e os testes fixam o dia sem trocar o relógio
    ano, mes = mes_atual(hoje, dias_antes)
    # O banco filtra só o cartão (a função pura não sabe o tipo da conta); as
    # outras regras ficam em projetar_parcelas, que é testada sem banco
    transacoes = Transacao.objects.filter(conta__tipo=Conta.Tipo.CARTAO)
    projecao = projetar_parcelas(transacoes, ano, mes)

    # Mesma ordem do GET /api/contas/ (banco e depois nome)
    cartoes = list(
        Conta.objects.filter(tipo=Conta.Tipo.CARTAO)
        .select_related("conexao")
        .order_by("conexao__nome_banco", "nome")
    )

    meses = []
    for item in projecao:
        por_conta = item["por_conta"]
        meses.append(
            {
                "mes": item["mes"],
                "total": item["total"],
                # Só os cartões com parcela no mês
                "cartoes": [
                    {
                        "conta": cartao.id,
                        "nome_banco": cartao.conexao.nome_banco,
                        "nome_conta": cartao.nome,
                        "total": por_conta[cartao.id],
                    }
                    for cartao in cartoes
                    if cartao.id in por_conta
                ],
            }
        )
    return {"meses": meses}
