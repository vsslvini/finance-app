from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

# Importa o módulo (e não as funções) para os testes conseguirem trocá-las
from financas.integracoes import pluggy
from financas.models import Categoria, Conexao, Conta, Investimento, Transacao

TIPOS_DE_CONTA = {
    "BANK": Conta.Tipo.CORRENTE,
    "CREDIT": Conta.Tipo.CARTAO,
}


def para_decimal(numero):
    # str() antes: Decimal(12.3) daria 12.300000000000000710...
    if numero is None:
        return None
    return Decimal(str(numero))


def para_data(texto):
    # Só o "aaaa-mm-dd", sem converter o fuso: em Brasília, meia-noite UTC
    # viraria 21h do dia anterior e a transação cairia no dia errado
    if not texto:
        return None
    return date.fromisoformat(texto[:10])


def salvar_conta(conexao, dados):
    credito = dados.get("creditData") or {}
    conta, _ = Conta.objects.update_or_create(
        id_pluggy=dados["id"],
        defaults={
            "conexao": conexao,
            "tipo": TIPOS_DE_CONTA[dados["type"]],
            "nome": dados["name"],
            "saldo": para_decimal(dados["balance"]),
            "limite_total": para_decimal(credito.get("creditLimit")),
            "limite_disponivel": para_decimal(credito.get("availableCreditLimit")),
            "data_fechamento": para_data(credito.get("balanceCloseDate")),
            "data_vencimento": para_data(credito.get("balanceDueDate")),
        },
    )
    return conta


def salvar_transacao(conta, dados):
    # O sinal vem do type, porque no cartão a Pluggy inverte o sinal do amount
    valor = abs(para_decimal(dados["amount"]))
    if dados["type"] == "DEBIT":
        valor = -valor

    parcelas = dados.get("creditCardMetadata") or {}
    # Só campos da Pluggy: categoria_manual fica de fora para não ser apagada
    Transacao.objects.update_or_create(
        id_pluggy=dados["id"],
        defaults={
            "conta": conta,
            "data": para_data(dados["date"]),
            "descricao": dados["description"],
            "valor": valor,
            "categoria_pluggy": dados.get("category") or "",
            "parcela_atual": parcelas.get("installmentNumber"),
            "total_parcelas": parcelas.get("totalInstallments"),
        },
    )


def apagar_transacoes_que_sumiram(conta, transacoes):
    # A Pluggy pode recriar uma transação com id novo; a antiga sumiria da lista.
    # Só olha o período devolvido, para não apagar o histórico mais antigo.
    if not transacoes:
        return
    datas = [para_data(dados["date"]) for dados in transacoes]
    ids_recebidos = [dados["id"] for dados in transacoes]
    Transacao.objects.filter(
        conta=conta,
        id_pluggy__isnull=False,  # manuais nunca são apagadas
        data__range=(min(datas), max(datas)),
    ).exclude(id_pluggy__in=ids_recebidos).delete()


def salvar_investimento(conexao, dados):
    # institution pode vir null (a Pluggy diz que só um conector manda)
    instituicao = dados.get("institution") or {}
    Investimento.objects.update_or_create(
        id_pluggy=dados["id"],
        defaults={
            "conexao": conexao,
            "nome": dados["name"],
            "tipo": dados["type"],
            "subtipo": dados.get("subtype") or "",
            "instituicao": instituicao.get("name") or "",
            "saldo": para_decimal(dados["balance"]),
            "status": dados.get("status") or "",
        },
    )


def apagar_investimentos_que_sumiram(conexao, investimentos):
    # Diferente das transações, a lista de investimentos vem sempre inteira e não
    # há nada manual neles; então o que não veio saiu daquela conexão
    ids_recebidos = [dados["id"] for dados in investimentos]
    da_conexao = Investimento.objects.filter(conexao=conexao)
    da_conexao.exclude(id_pluggy__in=ids_recebidos).delete()


def salvar_categoria(dados):
    Categoria.objects.update_or_create(
        id_pluggy=dados["id"],
        defaults={
            "descricao": dados["description"],
            "descricao_pt": dados.get("descriptionTranslated") or "",
            "id_pai": dados.get("parentId") or "",
        },
    )


def sincronizar():
    # Tudo ou nada: se der erro no meio, o banco volta a como estava
    with transaction.atomic():
        api_key = pluggy.obter_api_key()
        # As categorias valem para todas as conexões. As que sumirem da Pluggy
        # não são apagadas: uma transação antiga ainda pode usar o nome delas
        for dados_categoria in pluggy.listar_categorias(api_key):
            salvar_categoria(dados_categoria)

        for conexao in Conexao.objects.all():
            for dados_conta in pluggy.listar_contas(api_key, conexao.id_pluggy):
                # Tipo que não conhecemos (nem conta nem cartão): fica de fora
                if dados_conta["type"] not in TIPOS_DE_CONTA:
                    continue
                conta = salvar_conta(conexao, dados_conta)
                transacoes = pluggy.listar_transacoes(api_key, dados_conta["id"])
                for dados_transacao in transacoes:
                    salvar_transacao(conta, dados_transacao)
                apagar_transacoes_que_sumiram(conta, transacoes)

            investimentos = pluggy.listar_investimentos(api_key, conexao.id_pluggy)
            for dados_investimento in investimentos:
                salvar_investimento(conexao, dados_investimento)
            apagar_investimentos_que_sumiram(conexao, investimentos)

            conexao.ultima_atualizacao = timezone.now()
            conexao.save()
