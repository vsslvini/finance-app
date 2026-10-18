# Plano do Módulo 10: sincronização automática (RF25)

Decidido pelo Claude em 2026-10-17, no modo autônomo. Só backend e arquivos de configuração;
sem dependência nova.

## Contexto

- No Meu Pluggy, a Pluggy lê os bancos sozinha a cada 24 horas; o nosso `sincronizar()` só copia
  o que a Pluggy já tem (`docs/pluggy.md`, seção 2). Hoje a cópia só acontece quando a pessoa
  puxa a tela Início para baixo.
- O backend roda no computador do Vinicius (Arch Linux, systemd). Um agendador dentro do Django
  (Celery, APScheduler) seria dependência nova e mais uma peça rodando; o systemd já faz isso.

## Decisões

1. Um comando do Django, `python manage.py sincronizar`, chama o mesmo `sincronizar()` do
   service. Sai com código 0 e uma linha curta ("Sincronizado: 3 conexões, 2026-10-17 14:32")
   quando dá certo; com a Pluggy fora, escreve a mensagem no erro padrão e sai com código 1 (para
   o systemd registrar a falha).
2. Um timer do systemd **do usuário** (sem root) roda o comando a cada 3 horas e logo depois de
   ligar o computador (`OnBootSec`; o `Persistent=true` só vale com `OnCalendar=`, por isso ficou de fora), com o banco do Docker no ar. Os arquivos ficam em
   `deploy/systemd/` no repositório, com instruções de instalação; quem instala é o Vinicius
   (mexe na configuração do sistema).
3. 3 horas porque a Pluggy atualiza uma vez por dia em horário que não controlamos; ler 8 vezes
   por dia faz cerca de 120 chamadas por dia, muito abaixo do limite de 360 por minuto.

## Tarefas (`python-backend-engineer`)

- `financas/management/commands/sincronizar.py` (com os `__init__.py`).
- `deploy/systemd/app-financas-sincronizar.service` (Type=oneshot, `WorkingDirectory` do
  backend, `ExecStart` com o Python do `.venv`) e `app-financas-sincronizar.timer`
  (`OnBootSec=5min`, `OnUnitActiveSec=3h`). Caminhos com `%h` (pasta do
  usuário) e um comentário dizendo para ajustar se o projeto estiver em outro lugar.
- `deploy/systemd/README.md`: como instalar (`systemctl --user`), ver o próximo horário
  (`list-timers`), ver o log (`journalctl --user -u ...`) e desligar.

## Casos de teste

1. O comando chama `sincronizar()` e escreve "Sincronizado: N conexões, <data e hora>" (Pluggy
   falsa com `monkeypatch`, sem internet).
2. Com a Pluggy fora (`requests.RequestException`), escreve "Não foi possível falar com a Pluggy."
   no erro padrão e termina com `CommandError` (código 1).
3. Sem nenhuma conexão cadastrada, escreve "Nenhuma conexão cadastrada." e termina sem erro.
