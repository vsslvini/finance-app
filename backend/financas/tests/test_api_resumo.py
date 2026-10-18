from datetime import date, datetime
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from financas.models import Categoria, Conexao, Conta, Investimento, Transacao
from planejamento.models import Configuracao, PlanoDeGuardar

MES_INVALIDO = "Mês inválido. Use o formato AAAA-MM, ex.: 2026-10."


def salvar_configuracao(**campos):
    # Troca só os campos pedidos na configuração (a linha única do app)
    configuracao = Configuracao.atual()
    for campo, valor in campos.items():
        setattr(configuracao, campo, valor)
    configuracao.save()


def fixar_hoje(monkeypatch, dia):
    # A view pergunta o dia com timezone.localdate(); trocando essa função, a
    # view enxerga o dia que o teste quer. O monkeypatch desfaz a troca no fim
    monkeypatch.setattr(timezone, "localdate", lambda: dia)


@pytest.mark.django_db
def test_resumo_sem_token_responde_401():
    # Caso: sem token, a API recusa com 401
    cliente = APIClient()

    resposta = cliente.get("/api/resumo/")

    assert resposta.status_code == 401


def test_resumo_traz_as_chaves_e_dinheiro_como_texto(cliente_com_token):
    # Caso: 200 com exatamente as chaves combinadas, dinheiro como texto e os
    # últimos gastos no mesmo formato da rota de transações
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    conta = Conta.objects.create(
        conexao=conexao, tipo="corrente", nome="Conta Nubank", saldo=Decimal(1000)
    )
    # Data de hoje, para o teste não depender do dia em que roda
    hoje = timezone.localdate()
    gasto = Transacao.objects.create(
        conta=conta,
        data=hoje,
        descricao="Mercado",
        valor=Decimal("-50.00"),
        categoria_pluggy="Supermercado",
    )

    resposta = cliente_com_token.get("/api/resumo/")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert set(dados) == {
        "mes",
        "dia_do_mes",
        "dias_no_mes",
        "saldo_total",
        "fatura_aberta",
        "entradas",
        "saidas",
        "posso_gastar_por_dia",
        "ultimos_gastos",
        "limite_fatura",
        "fatura_acima_do_limite",
        "guardado",
        "ultima_atualizacao",
    }
    assert dados["saldo_total"] == "1000.00"
    assert dados["fatura_aberta"] == "0.00"
    # Sem configuração salva: sem limite e sem aviso
    assert dados["limite_fatura"] is None
    assert dados["fatura_acima_do_limite"] is False
    assert dados["entradas"] == "0.00"
    assert dados["saidas"] == "50.00"
    # O valor muda com o dia; aqui importa só que venha como texto
    assert isinstance(dados["posso_gastar_por_dia"], str)
    assert dados["ultimos_gastos"] == [
        {
            "id": gasto.id,
            "data": hoje.isoformat(),
            "descricao": "Mercado",
            "valor": "-50.00",
            "conta": conta.id,
            "nome_conta": "Conta Nubank",
            "nome_banco": "Nubank",
            "categoria": "Supermercado",
            "categoria_original": "Supermercado",
            "parcela_atual": None,
            "total_parcelas": None,
        }
    ]


def test_ultimos_gastos_vem_traduzidos(cliente_com_token):
    # Caso 5 do Módulo 8: os últimos gastos do resumo trazem a categoria em
    # português e a original em inglês, como a lista de transações
    Categoria.objects.create(
        id_pluggy="08000000", descricao="Groceries", descricao_pt="Mercado"
    )
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    conta = Conta.objects.create(
        conexao=conexao, tipo="corrente", nome="Conta Nubank", saldo=Decimal(0)
    )
    Transacao.objects.create(
        conta=conta,
        data=timezone.localdate(),
        descricao="Mercado do bairro",
        valor=Decimal("-50.00"),
        categoria_pluggy="Groceries",
    )

    resposta = cliente_com_token.get("/api/resumo/")

    gasto = resposta.json()["ultimos_gastos"][0]
    assert gasto["categoria"] == "Mercado"
    assert gasto["categoria_original"] == "Groceries"


def test_resumo_mostra_o_limite_e_o_aviso_da_fatura(cliente_com_token):
    # Caso: com limite de 500 salvo e fatura de 600, a resposta traz o limite
    # como texto e o aviso ligado
    salvar_configuracao(limite_fatura=Decimal("500.00"))
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    Conta.objects.create(
        conexao=conexao, tipo="cartao", nome="Black", saldo=Decimal("600.00")
    )

    resposta = cliente_com_token.get("/api/resumo/")

    dados = resposta.json()
    assert dados["fatura_aberta"] == "600.00"
    assert dados["limite_fatura"] == "500.00"
    assert dados["fatura_acima_do_limite"] is True


def test_resumo_usa_os_dias_antes_da_configuracao(cliente_com_token):
    # Caso: com 2 dias antes salvos, o salário de 30/09 entra em outubro
    salvar_configuracao(dias_antes_do_mes=2)
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    conta = Conta.objects.create(
        conexao=conexao, tipo="corrente", nome="Conta Nubank", saldo=Decimal(0)
    )
    Transacao.objects.create(
        conta=conta,
        data=date(2026, 9, 30),
        descricao="Salário",
        valor=Decimal("3000.00"),
    )

    resposta = cliente_com_token.get("/api/resumo/?mes=2026-10")

    assert resposta.json()["entradas"] == "3000.00"


def test_resumo_traz_o_mes_o_dia_e_o_total_de_dias(cliente_com_token, monkeypatch):
    # Caso: 2 dias antes, hoje 10/10/2026, sem ?mes=: outubro, dia 12 de 31.
    # Pedindo setembro, o mês vem preenchido e o dia e o total vêm null
    salvar_configuracao(dias_antes_do_mes=2)
    fixar_hoje(monkeypatch, date(2026, 10, 10))

    atual = cliente_com_token.get("/api/resumo/").json()
    setembro = cliente_com_token.get("/api/resumo/?mes=2026-09").json()

    assert atual["mes"] == "2026-10"
    assert atual["dia_do_mes"] == 12
    assert atual["dias_no_mes"] == 31
    assert setembro["mes"] == "2026-09"
    assert setembro["dia_do_mes"] is None
    assert setembro["dias_no_mes"] is None


def test_resumo_sem_mes_no_dia_30_ja_e_novembro(cliente_com_token, monkeypatch):
    # Caso: 2 dias antes, hoje 30/10/2026, sem ?mes=: novembro já começou
    # (vai de 30/10 a 28/11, 30 dias), e hoje é o dia 1 dele
    salvar_configuracao(dias_antes_do_mes=2)
    fixar_hoje(monkeypatch, date(2026, 10, 30))

    dados = cliente_com_token.get("/api/resumo/").json()

    assert dados["mes"] == "2026-11"
    assert dados["dia_do_mes"] == 1
    assert dados["dias_no_mes"] == 30


def test_resumo_mes_invalido_responde_400_com_mensagem(cliente_com_token):
    # Caso: mês 13 ou texto qualquer recebe 400 com a mesma mensagem das transações
    for mes in ["2026-13", "abc"]:
        resposta = cliente_com_token.get(f"/api/resumo/?mes={mes}")

        assert resposta.status_code == 400
        assert resposta.json() == {"detail": MES_INVALIDO}


def test_resumo_sem_plano_traz_guardado_com_plano_null(cliente_com_token):
    # Caso 9 do Módulo 5: sem investimentos e sem plano, o bloco guardado vem
    # com zeros como texto, plano null e nada faltando guardar
    resposta = cliente_com_token.get("/api/resumo/")

    assert resposta.status_code == 200
    assert resposta.json()["guardado"] == {
        "total": "0.00",
        "este_mes": "0.00",
        "plano": None,
        "previsto": None,
        "progresso": None,
        "falta_guardar_no_mes": "0.00",
    }


def test_resumo_com_plano_traz_o_bloco_guardado(cliente_com_token, monkeypatch):
    # Caso 9 do Módulo 5: hoje 08/10/2026, 1300 guardados, 300 aplicados em
    # outubro e plano de 500 por mês até julho de 2027. Outubro ainda não foi
    # guardado, então previsto = 1300 + 10 x 500 = 6300, progresso 20 (20,63%)
    # e faltam 200. O mês do plano sai como "2027-07", igual em /api/plano/
    fixar_hoje(monkeypatch, date(2026, 10, 8))
    plano = PlanoDeGuardar.atual()
    plano.valor_mensal = Decimal("500.00")
    plano.mes_alvo = date(2027, 7, 1)
    plano.save()
    conexao = Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    Investimento.objects.create(
        conexao=conexao,
        id_pluggy="cdb",
        nome="CDB Nubank",
        tipo="FIXED_INCOME",
        saldo=Decimal("1300.00"),
    )
    conta = Conta.objects.create(
        conexao=conexao, tipo="corrente", nome="Conta Nubank", saldo=Decimal(0)
    )
    Transacao.objects.create(
        conta=conta,
        data=date(2026, 10, 5),
        descricao="Aplicação",
        valor=Decimal("-300.00"),
        categoria_pluggy="Investments",
    )

    resposta = cliente_com_token.get("/api/resumo/")

    assert resposta.json()["guardado"] == {
        "total": "1300.00",
        "este_mes": "300.00",
        "plano": {"valor_mensal": "500.00", "mes_alvo": "2027-07"},
        "previsto": "6300.00",
        "progresso": 20,
        "falta_guardar_no_mes": "200.00",
    }


def test_resumo_traz_a_ultima_atualizacao_mais_recente(cliente_com_token):
    # Caso 1 do Módulo 3b-2: com duas conexões, vale a sincronização mais
    # recente, e a hora sai no fuso do projeto (America/Manaus, -04:00), para o
    # app só recortar o texto
    fuso = timezone.get_current_timezone()
    Conexao.objects.create(
        id_pluggy="item-nubank",
        nome_banco="Nubank",
        ultima_atualizacao=datetime(2026, 10, 17, 9, 10, tzinfo=fuso),
    )
    Conexao.objects.create(
        id_pluggy="item-inter",
        nome_banco="Inter",
        ultima_atualizacao=datetime(2026, 10, 17, 14, 32, tzinfo=fuso),
    )

    resposta = cliente_com_token.get("/api/resumo/")

    assert resposta.json()["ultima_atualizacao"] == "2026-10-17T14:32:00-04:00"


def test_resumo_sem_sincronizar_traz_ultima_atualizacao_null(cliente_com_token):
    # Caso 2 do Módulo 3b-2: conexão cadastrada, mas nunca sincronizada
    Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")

    resposta = cliente_com_token.get("/api/resumo/")

    assert resposta.json()["ultima_atualizacao"] is None
