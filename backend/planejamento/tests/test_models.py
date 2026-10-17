from planejamento.models import Configuracao, PlanoDeGuardar


def test_sem_nada_salvo_valem_os_padroes(db):
    # Caso: sem nada salvo, valem 0 dias antes e nenhum limite de fatura
    configuracao = Configuracao.atual()

    assert configuracao.dias_antes_do_mes == 0
    assert configuracao.limite_fatura is None


def test_atual_usa_sempre_a_mesma_linha(db):
    # Caso: chamar atual() de novo não cria outra linha; é sempre a mesma
    primeira = Configuracao.atual()
    segunda = Configuracao.atual()

    assert primeira.pk == segunda.pk
    assert Configuracao.objects.count() == 1


def test_plano_sem_nada_salvo_fica_vazio(db):
    # Caso 8 do Módulo 5: sem nada salvo, não há plano (os dois campos vazios)
    plano = PlanoDeGuardar.atual()

    assert plano.valor_mensal is None
    assert plano.mes_alvo is None


def test_plano_atual_usa_sempre_a_mesma_linha(db):
    # Caso 8 do Módulo 5: como a Configuracao, o plano é uma linha só
    primeiro = PlanoDeGuardar.atual()
    segundo = PlanoDeGuardar.atual()

    assert primeiro.pk == segundo.pk
    assert PlanoDeGuardar.objects.count() == 1
