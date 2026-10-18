# Módulo 10: sincronização automática

Escrito em 2026-10-17. Atende RF25. Plano em
[`../../planos/modulo-10-sincronizacao-automatica.md`](../../planos/modulo-10-sincronizacao-automatica.md).
**Antes, estude** [`api-de-leitura.md`](api-de-leitura.md) (o `sincronizar()`) e
[`../pytest.md`](../pytest.md), seção 7 (`capsys`).

## 1. O que o módulo entrega

- `python manage.py sincronizar`: copia os dados da Pluggy, como o puxar para baixo do Início.
  Escreve "Sincronizado: 3 conexões, 2026-10-17 23:49"; com a Pluggy fora, termina com erro
  (código 1); sem conexões, avisa "Nenhuma conexão cadastrada.".
- `deploy/systemd/`: um timer do systemd do usuário que roda o comando 5 minutos depois de
  ligar e, depois, a cada 3 horas. Instalação no `deploy/systemd/README.md`.
- 3 testes novos; o backend tem 180.

## 2. Por que um timer do systemd

Um agendador dentro do Django (Celery, APScheduler) seria dependência nova e mais um processo
rodando. O systemd já vem no Linux e sabe rodar um programa de tempos em tempos, guardar o log
(`journalctl`) e mostrar a próxima execução (`systemctl --user list-timers`). A cada 3 horas
porque a Pluggy atualiza uma vez por dia, em horário que não controlamos; são cerca de 8 leituras
por dia, muito abaixo do limite.

## 3. Conceitos novos

- **Comando do Django**: um arquivo em `<app>/management/commands/<nome>.py` com uma classe
  `Command(BaseCommand)` e o método `handle()`. As pastas precisam de `__init__.py`.
- **`CommandError`**: erro próprio dos comandos; no terminal, o Django escreve a mensagem e sai
  com o código 1, que o systemd registra como falha.
- **`call_command`** (Django) roda o comando dentro do teste; **`capsys`** (pytest) captura o
  que foi escrito na saída padrão e no erro padrão.
- **Timer do systemd**: um `.service` diz o que rodar (`Type=oneshot`: roda e termina) e um
  `.timer` diz quando (`OnBootSec=5min`, `OnUnitActiveSec=3h`). `%h` é a pasta do usuário. O
  `Persistent=true` ficou de fora: ele só vale para timers com `OnCalendar=` (man
  systemd.timer).

## 4. Arquivos

- `backend/financas/management/commands/sincronizar.py` (e os `__init__.py`).
- `backend/financas/tests/test_comando_sincronizar.py`.
- `deploy/systemd/app-financas-sincronizar.service`, `.timer` e `README.md`.
- `docs/estudos/pytest.md`: `capsys` e o `as erro` do `pytest.raises`.

## 5. Os testes

1. `test_comando_sincroniza_e_mostra_conexoes_e_horario`: um `sincronizar` falso grava a hora;
   a saída é "Sincronizado: 2 conexões, 2026-10-17 14:32" (hora no fuso do projeto).
2. `test_comando_com_pluggy_fora_termina_com_command_error`: `CommandError` com a mensagem e
   `returncode == 1`.
3. `test_comando_sem_conexoes_avisa_e_termina_sem_erro`: aviso e nenhuma chamada à Pluggy.

## 6. Instalar (Vinicius)

```fish
mkdir -p ~/.config/systemd/user
cp deploy/systemd/app-financas-sincronizar.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now app-financas-sincronizar.timer
systemctl --user list-timers
```

## 7. Limites

- Só roda com você logado (o systemd do usuário começa no login) e com o banco do Docker no ar.
- Com 1 conexão, a mensagem diz "1 conexões".
