from datetime import date
from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction

from financas.models import Conexao, Conta, Transacao


@pytest.fixture
def conta(db):
    # Conta reaproveitada pelos testes que salvam transações no banco
    conexao = Conexao.objects.create(id_pluggy="conexao-teste", nome_banco="Nubank")
    return Conta.objects.create(
        conexao=conexao,
        tipo="corrente",
        nome="Conta Nubank",
        saldo=Decimal("100.00"),
    )


def criar_transacao(conta, **campos):
    # Cria uma transação com valores padrão; cada teste troca só o que importa
    dados = {
        "data": date(2026, 10, 1),
        "descricao": "Padaria",
        "valor": Decimal("-10.00"),
    }
    # update: o que o teste mandar em campos substitui o padrão de mesmo nome
    dados.update(campos)
    return Transacao.objects.create(conta=conta, **dados)


def test_categoria_exibida_usa_a_da_pluggy():
    # Caso: transação com categoria da Pluggy "Alimentação" e sem manual
    transacao = Transacao(categoria_pluggy="Alimentação")

    assert transacao.categoria_exibida == "Alimentação"


def test_categoria_exibida_sem_categoria():
    # Caso: transação sem nenhuma categoria aparece como "Sem categoria"
    transacao = Transacao()

    assert transacao.categoria_exibida == "Sem categoria"


def test_categoria_exibida_prefere_a_manual():
    # Caso: a categoria manual vence a da Pluggy
    transacao = Transacao(categoria_pluggy="Alimentação", categoria_manual="Mercado")

    assert transacao.categoria_exibida == "Mercado"


@pytest.mark.django_db
def test_valor_volta_do_banco_exato_em_centavos(conta):
    # Caso: salvo -19.90 e, ao ler de novo do banco, continua -19.90
    transacao = criar_transacao(conta, valor=Decimal("-19.90"))

    transacao.refresh_from_db()

    assert transacao.valor == Decimal("-19.90")


@pytest.mark.django_db
def test_transacao_manual_sem_id_pluggy_e_salva(conta):
    # Caso: gasto manual (sem id da Pluggy) é salvo sem erro
    criar_transacao(conta)

    assert Transacao.objects.count() == 1
    assert Transacao.objects.get().id_pluggy is None


@pytest.mark.django_db
def test_duas_transacoes_manuais_sem_id_pluggy(conta):
    # Caso: várias transações manuais convivem, mesmo com id_pluggy único
    criar_transacao(conta)
    criar_transacao(conta)

    assert Transacao.objects.count() == 2


@pytest.mark.django_db
def test_id_pluggy_repetido_da_erro(conta):
    # Caso: a mesma transação da Pluggy não pode ser gravada duas vezes
    criar_transacao(conta, id_pluggy="abc")

    # O atomic isola o erro num "savepoint", e o resto do teste segue válido
    with pytest.raises(IntegrityError), transaction.atomic():
        criar_transacao(conta, id_pluggy="abc")

    assert Transacao.objects.count() == 1
