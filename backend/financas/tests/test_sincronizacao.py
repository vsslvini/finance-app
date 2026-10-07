from datetime import date
from decimal import Decimal

import pytest
import requests

from financas.models import Conexao, Conta, Transacao
from financas.sincronizacao import sincronizar


def conta_pluggy(**campos):
    # Conta corrente no formato da Pluggy; cada teste troca só o que importa
    conta = {
        "id": "conta-corrente",
        "type": "BANK",
        "subtype": "CHECKING_ACCOUNT",
        "name": "Conta Corrente",
        "balance": 1500.50,
        "creditData": None,
    }
    conta.update(campos)
    return conta


def cartao_pluggy(**campos):
    # Cartão de crédito no formato da Pluggy
    cartao = {
        "id": "conta-cartao",
        "type": "CREDIT",
        "subtype": "CREDIT_CARD",
        "name": "Mastercard Black",
        "balance": 850.25,
        "creditData": {
            "creditLimit": 5000.0,
            "availableCreditLimit": 4149.75,
            "balanceCloseDate": "2026-10-20T00:00:00.000Z",
            "balanceDueDate": "2026-10-27T00:00:00.000Z",
        },
    }
    cartao.update(campos)
    return cartao


def transacao_pluggy(**campos):
    # Transação no formato da Pluggy (sem creditCardMetadata, como numa conta)
    transacao = {
        "id": "transacao-1",
        "date": "2026-10-05T00:00:00.000Z",
        "description": "Padaria",
        "amount": -10.0,
        "type": "DEBIT",
        "status": "POSTED",
        "category": "Alimentação",
    }
    transacao.update(campos)
    return transacao


@pytest.fixture
def conexao(db):
    # Conexão cadastrada no admin, com o id do item copiado do painel da Pluggy
    return Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")


@pytest.fixture
def dados_pluggy(monkeypatch):
    # O que a Pluggy falsa devolve: contas por id do item e transações por id da
    # conta. O teste pode mudar este dicionário antes de chamar sincronizar()
    dados = {
        "contas": {"item-nubank": [conta_pluggy()]},
        "transacoes": {"conta-corrente": [transacao_pluggy()]},
    }

    def obter_api_key_falso():
        return "chave-falsa"

    def listar_contas_falso(api_key, item_id):
        return dados["contas"].get(item_id, [])

    def listar_transacoes_falso(api_key, conta_id):
        return dados["transacoes"].get(conta_id, [])

    monkeypatch.setattr("financas.pluggy.obter_api_key", obter_api_key_falso)
    monkeypatch.setattr("financas.pluggy.listar_contas", listar_contas_falso)
    monkeypatch.setattr("financas.pluggy.listar_transacoes", listar_transacoes_falso)
    return dados


@pytest.mark.django_db
def test_conta_bank_vira_conta_corrente_da_conexao_certa(conexao, dados_pluggy):
    # Caso: conta BANK com saldo 1500.50 vira Conta "corrente" ligada à sua conexão
    inter = Conexao.objects.create(id_pluggy="item-inter", nome_banco="Inter")
    dados_pluggy["contas"]["item-inter"] = [
        conta_pluggy(id="conta-inter", name="Conta Inter"),
    ]

    sincronizar()

    conta = Conta.objects.get(id_pluggy="conta-corrente")
    assert conta.tipo == "corrente"
    assert conta.nome == "Conta Corrente"
    assert conta.saldo == Decimal("1500.50")
    assert conta.conexao == conexao
    assert Conta.objects.get(id_pluggy="conta-inter").conexao == inter


@pytest.mark.django_db
def test_conta_credit_vira_cartao_com_limites_e_datas(conexao, dados_pluggy):
    # Caso: conta CREDIT vira Conta "cartao" com limites e datas da fatura
    dados_pluggy["contas"]["item-nubank"] = [cartao_pluggy()]

    sincronizar()

    cartao = Conta.objects.get(id_pluggy="conta-cartao")
    assert cartao.tipo == "cartao"
    assert cartao.saldo == Decimal("850.25")
    assert cartao.limite_total == Decimal("5000.00")
    assert cartao.limite_disponivel == Decimal("4149.75")
    assert cartao.data_fechamento == date(2026, 10, 20)
    assert cartao.data_vencimento == date(2026, 10, 27)


@pytest.mark.django_db
def test_sincronizar_duas_vezes_nao_duplica(conexao, dados_pluggy):
    # Caso: sincronizar duas vezes com os mesmos dados não muda as contagens
    sincronizar()
    sincronizar()

    assert Conta.objects.count() == 1
    assert Transacao.objects.count() == 1


@pytest.mark.django_db
def test_saldo_novo_atualiza_a_conta_existente(conexao, dados_pluggy):
    # Caso: o saldo muda na Pluggy e a mesma conta é atualizada (sem criar outra)
    sincronizar()
    pk_antes = Conta.objects.get().pk
    dados_pluggy["contas"]["item-nubank"][0]["balance"] = 2000.0

    sincronizar()

    conta = Conta.objects.get()
    assert conta.pk == pk_antes
    assert conta.saldo == Decimal("2000.00")
    assert Conta.objects.count() == 1


@pytest.mark.django_db
def test_sinal_do_valor_segue_o_type(conexao, dados_pluggy):
    # Caso: DEBIT vira valor negativo e CREDIT vira positivo, na conta e no cartão
    dados_pluggy["contas"]["item-nubank"] = [conta_pluggy(), cartao_pluggy()]
    dados_pluggy["transacoes"] = {
        "conta-corrente": [
            transacao_pluggy(id="pix-enviado", amount=-45.90, type="DEBIT"),
            transacao_pluggy(id="salario", amount=3000.0, type="CREDIT"),
        ],
        # No cartão a Pluggy inverte o sinal do amount, mas o type é o mesmo
        "conta-cartao": [
            transacao_pluggy(id="compra", amount=120.0, type="DEBIT"),
            transacao_pluggy(id="pagamento", amount=-850.25, type="CREDIT"),
        ],
    }

    sincronizar()

    assert Transacao.objects.get(id_pluggy="pix-enviado").valor == Decimal("-45.90")
    assert Transacao.objects.get(id_pluggy="salario").valor == Decimal("3000.00")
    assert Transacao.objects.get(id_pluggy="compra").valor == Decimal("-120.00")
    assert Transacao.objects.get(id_pluggy="pagamento").valor == Decimal("850.25")


@pytest.mark.django_db
def test_valor_quebrado_fica_exato_em_centavos(conexao, dados_pluggy):
    # Caso: amount 12.3 (número quebrado) vira exatamente Decimal("12.30")
    dados_pluggy["transacoes"]["conta-corrente"] = [
        transacao_pluggy(amount=12.3, type="CREDIT"),
    ]

    sincronizar()

    assert Transacao.objects.get().valor == Decimal("12.30")


@pytest.mark.django_db
def test_data_usa_so_o_dia_do_texto_da_pluggy(conexao, dados_pluggy):
    # Caso: date "2026-10-05T00:00:00.000Z" vira date(2026, 10, 5)
    sincronizar()

    assert Transacao.objects.get().data == date(2026, 10, 5)


@pytest.mark.django_db
def test_parcelas_vem_do_credit_card_metadata(conexao, dados_pluggy):
    # Caso: parcela 3 de 10 é guardada; sem creditCardMetadata fica None e None
    dados_pluggy["contas"]["item-nubank"] = [cartao_pluggy()]
    parcelada = transacao_pluggy(
        id="parcelada",
        creditCardMetadata={"installmentNumber": 3, "totalInstallments": 10},
    )
    dados_pluggy["transacoes"] = {
        "conta-cartao": [parcelada, transacao_pluggy(id="a-vista")],
    }

    sincronizar()

    parcelada = Transacao.objects.get(id_pluggy="parcelada")
    assert parcelada.parcela_atual == 3
    assert parcelada.total_parcelas == 10
    a_vista = Transacao.objects.get(id_pluggy="a-vista")
    assert a_vista.parcela_atual is None
    assert a_vista.total_parcelas is None


@pytest.mark.django_db
def test_sem_category_fica_sem_categoria(conexao, dados_pluggy):
    # Caso: category ausente ou None vira "" e aparece como "Sem categoria"
    sem_campo = transacao_pluggy(id="sem-campo")
    del sem_campo["category"]
    dados_pluggy["transacoes"]["conta-corrente"] = [
        sem_campo,
        transacao_pluggy(id="campo-nulo", category=None),
    ]

    sincronizar()

    assert Transacao.objects.count() == 2
    for transacao in Transacao.objects.all():
        assert transacao.categoria_pluggy == ""
        assert transacao.categoria_exibida == "Sem categoria"


@pytest.mark.django_db
def test_categoria_manual_continua_depois_de_sincronizar(conexao, dados_pluggy):
    # Caso: a categoria que o usuário escolheu não é apagada na sincronização
    sincronizar()
    Transacao.objects.update(categoria_manual="Mercado")

    sincronizar()

    assert Transacao.objects.get().categoria_manual == "Mercado"


@pytest.mark.django_db
def test_transacao_que_sumiu_dentro_do_periodo_e_apagada(conexao, dados_pluggy):
    # Caso: transação da Pluggy entre a menor e a maior data devolvidas, que não
    # veio mais, é apagada (a Pluggy apagou ou trocou o id dela)
    dados_pluggy["transacoes"]["conta-corrente"] = [
        transacao_pluggy(id="dia-01", date="2026-10-01T00:00:00.000Z"),
        transacao_pluggy(id="dia-05", date="2026-10-05T00:00:00.000Z"),
        transacao_pluggy(id="dia-10", date="2026-10-10T00:00:00.000Z"),
    ]
    sincronizar()
    dados_pluggy["transacoes"]["conta-corrente"] = [
        transacao_pluggy(id="dia-01", date="2026-10-01T00:00:00.000Z"),
        transacao_pluggy(id="dia-10", date="2026-10-10T00:00:00.000Z"),
    ]

    sincronizar()

    assert not Transacao.objects.filter(id_pluggy="dia-05").exists()
    assert Transacao.objects.count() == 2


@pytest.mark.django_db
def test_transacao_antiga_fora_do_periodo_continua(conexao, dados_pluggy):
    # Caso: transação da Pluggy mais antiga que o período devolvido não é apagada
    dados_pluggy["transacoes"]["conta-corrente"] = [
        transacao_pluggy(id="setembro", date="2026-09-01T00:00:00.000Z"),
        transacao_pluggy(id="dia-10", date="2026-10-10T00:00:00.000Z"),
    ]
    sincronizar()
    dados_pluggy["transacoes"]["conta-corrente"] = [
        transacao_pluggy(id="dia-05", date="2026-10-05T00:00:00.000Z"),
        transacao_pluggy(id="dia-10", date="2026-10-10T00:00:00.000Z"),
    ]

    sincronizar()

    assert Transacao.objects.filter(id_pluggy="setembro").exists()
    assert Transacao.objects.count() == 3


@pytest.mark.django_db
def test_transacao_manual_nunca_e_apagada(conexao, dados_pluggy):
    # Caso: gasto manual (id_pluggy None) dentro do período continua no banco
    dados_pluggy["transacoes"]["conta-corrente"] = [
        transacao_pluggy(id="dia-01", date="2026-10-01T00:00:00.000Z"),
        transacao_pluggy(id="dia-10", date="2026-10-10T00:00:00.000Z"),
    ]
    sincronizar()
    Transacao.objects.create(
        conta=Conta.objects.get(),
        data=date(2026, 10, 5),
        descricao="Feira",
        valor=Decimal("-30.00"),
    )

    sincronizar()

    assert Transacao.objects.filter(id_pluggy__isnull=True).count() == 1
    assert Transacao.objects.count() == 3


@pytest.mark.django_db
def test_erro_no_meio_nao_salva_nada(conexao, dados_pluggy, monkeypatch):
    # Caso: a Pluggy falha ao listar transações, depois das contas, e nada fica salvo
    def listar_transacoes_com_erro(api_key, conta_id):
        raise requests.HTTPError("Erro 500")

    monkeypatch.setattr("financas.pluggy.listar_transacoes", listar_transacoes_com_erro)

    with pytest.raises(requests.HTTPError):
        sincronizar()

    assert Conta.objects.count() == 0
    assert Transacao.objects.count() == 0
    conexao.refresh_from_db()
    assert conexao.ultima_atualizacao is None


@pytest.mark.django_db
def test_ultima_atualizacao_preenchida_ao_terminar(conexao, dados_pluggy):
    # Caso: ao terminar, a conexão guarda quando foi atualizada
    sincronizar()

    conexao.refresh_from_db()
    assert conexao.ultima_atualizacao is not None


@pytest.mark.django_db
def test_transacao_de_outra_conta_nao_e_apagada(conexao, dados_pluggy):
    # Caso: a compra do cartão, no período da conta corrente, não é apagada só por
    # não vir na lista da conta corrente
    dados_pluggy["contas"]["item-nubank"] = [conta_pluggy(), cartao_pluggy()]
    dados_pluggy["transacoes"] = {
        "conta-corrente": [
            transacao_pluggy(id="dia-01", date="2026-10-01T00:00:00.000Z"),
            transacao_pluggy(id="dia-10", date="2026-10-10T00:00:00.000Z"),
        ],
        "conta-cartao": [
            transacao_pluggy(id="compra-cartao", date="2026-10-05T00:00:00.000Z"),
        ],
    }
    sincronizar()
    # Cartão sem transações: não há período dele, então nada dele pode ser apagado,
    # e a compra também não é recriada, seja qual for a ordem das contas
    dados_pluggy["transacoes"]["conta-cartao"] = []

    sincronizar()

    assert Transacao.objects.filter(id_pluggy="compra-cartao").exists()
    assert Transacao.objects.count() == 3
