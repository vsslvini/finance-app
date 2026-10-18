from datetime import UTC, datetime

import pytest
import requests
from django.core.management import call_command
from django.core.management.base import CommandError

from financas.models import Conexao

# 18:32 em UTC é 14:32 no fuso do settings (America/Manaus, UTC-4)
HORA_DA_SINCRONIZACAO = datetime(2026, 10, 17, 18, 32, tzinfo=UTC)


@pytest.fixture
def sincronizar_falso(monkeypatch):
    # Troca o sincronizar() de verdade (que chama a Pluggy pela internet) por um
    # falso, como no test_api_sincronizar.py. O comando chama
    # "sincronizacao.sincronizar()", então a troca é feita no módulo
    # financas.services.sincronizacao. O falso faz o que o de verdade faz no fim
    # (preenche ultima_atualizacao), com uma hora fixa para o teste saber o que
    # esperar. A lista guarda cada chamada feita
    chamadas = []

    def sincronizar_que_so_anota():
        chamadas.append("chamou")
        Conexao.objects.update(ultima_atualizacao=HORA_DA_SINCRONIZACAO)

    monkeypatch.setattr(
        "financas.services.sincronizacao.sincronizar", sincronizar_que_so_anota
    )
    return chamadas


@pytest.mark.django_db
def test_comando_sincroniza_e_mostra_conexoes_e_horario(sincronizar_falso, capsys):
    # Caso 1: o comando chama sincronizar() e escreve "Sincronizado: N conexões,
    # <data e hora>" na saída padrão
    Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")
    Conexao.objects.create(id_pluggy="item-inter", nome_banco="Inter")

    # call_command roda o comando como o "python manage.py sincronizar", mas
    # dentro do teste
    call_command("sincronizar")

    # capsys guardou tudo o que foi escrito na saída padrão (out) e no erro
    # padrão (err) até aqui. O "\n" do fim é o Django que coloca em cada write()
    saida = capsys.readouterr()
    assert sincronizar_falso == ["chamou"]
    assert saida.out == "Sincronizado: 2 conexões, 2026-10-17 14:32\n"
    assert saida.err == ""


@pytest.mark.django_db
def test_comando_com_pluggy_fora_termina_com_command_error(monkeypatch, capsys):
    # Caso 2: a Pluggy falha (erro do requests) e o comando termina com
    # CommandError de código 1, com a mensagem "Não foi possível falar com a
    # Pluggy."
    Conexao.objects.create(id_pluggy="item-nubank", nome_banco="Nubank")

    def sincronizar_com_erro():
        raise requests.ConnectionError("Sem conexão com a Pluggy")

    monkeypatch.setattr(
        "financas.services.sincronizacao.sincronizar", sincronizar_com_erro
    )

    # Pelo terminal, o Django pega o CommandError, escreve "CommandError: <mensagem>"
    # no erro padrão e sai com o returncode (é isso que o systemd registra). Pelo
    # call_command o erro não é pego: ele chega até o teste. Por isso conferimos o
    # erro em si (mensagem e código), e não o texto no erro padrão
    with pytest.raises(CommandError) as erro:
        call_command("sincronizar")

    # erro.value é o CommandError que o comando levantou
    assert str(erro.value).startswith("Não foi possível falar com a Pluggy.")
    assert erro.value.returncode == 1
    # Nada de "Sincronizado" na saída padrão quando dá errado
    assert capsys.readouterr().out == ""


@pytest.mark.django_db
def test_comando_sem_conexoes_avisa_e_termina_sem_erro(sincronizar_falso, capsys):
    # Caso 3: sem nenhuma conexão cadastrada, escreve "Nenhuma conexão
    # cadastrada." e termina sem erro (se levantasse um erro, o teste falharia)
    call_command("sincronizar")

    assert capsys.readouterr().out == "Nenhuma conexão cadastrada.\n"
    # Sem conexão não há o que buscar: a Pluggy nem é chamada
    assert sincronizar_falso == []
