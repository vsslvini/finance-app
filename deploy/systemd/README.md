# Sincronização automática com o systemd (RF25)

Dois arquivos fazem o backend copiar os dados da Pluggy sozinho, sem precisar puxar a
tela Início para baixo:

- `app-financas-sincronizar.service`: roda `python manage.py sincronizar` uma vez e
  termina (`Type=oneshot`).
- `app-financas-sincronizar.timer`: chama o serviço 5 minutos depois de ligar o
  computador (`OnBootSec=5min`) e, depois, 3 horas após cada execução
  (`OnUnitActiveSec=3h`).

São unidades **do usuário** (`systemctl --user`): não precisam de root e rodam com o seu
usuário, lendo o mesmo `.env` da raiz. O gerenciador do usuário começa no primeiro login,
então o timer só roda com você logado no computador.

Antes de instalar, confira os caminhos no `.service` (o padrão é
`~/Projetos/app-finacas`) e lembre que o banco do Docker precisa estar no ar
(`docker compose up -d`); sem ele, a execução falha e aparece no log.

## Instalar

Na raiz do repositório:

```fish
mkdir -p ~/.config/systemd/user
cp deploy/systemd/app-financas-sincronizar.service deploy/systemd/app-financas-sincronizar.timer ~/.config/systemd/user/
systemd-analyze --user verify ~/.config/systemd/user/app-financas-sincronizar.service
systemctl --user daemon-reload
systemctl --user enable --now app-financas-sincronizar.timer
```

- `cp`: o systemd do usuário procura as unidades em `~/.config/systemd/user/`.
- `systemd-analyze --user verify`: confere os arquivos; sem saída quer dizer que está ok.
- `daemon-reload`: faz o systemd ler os arquivos novos (rode de novo sempre que copiar
  uma versão alterada).
- `enable --now`: liga o timer agora e a cada login (`WantedBy=timers.target`). Só o
  timer é ligado; o serviço é chamado por ele.

## Ver o próximo horário

```fish
systemctl --user list-timers app-financas-sincronizar.timer
```

A coluna `NEXT` mostra a próxima execução e `LAST`, a última.

## Rodar agora (sem esperar o timer)

```fish
systemctl --user start app-financas-sincronizar.service
```

## Ver o log

```fish
journalctl --user -u app-financas-sincronizar.service
```

Quando dá certo, aparece `Sincronizado: N conexões, aaaa-mm-dd hh:mm`. Com a Pluggy fora,
aparece `CommandError: Não foi possível falar com a Pluggy. (motivo)` e o serviço fica
como falho (código de saída 1). Sem conexão cadastrada, aparece
`Nenhuma conexão cadastrada.`.

## Desligar

```fish
systemctl --user disable --now app-financas-sincronizar.timer
```

Para remover de vez, apague os dois arquivos de `~/.config/systemd/user/` e rode
`systemctl --user daemon-reload`.

## Fontes

Conferidas em 2026-10-17:

- https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
  (`OnBootSec=`, `OnUnitActiveSec=`, `Unit=` com o mesmo nome do timer por padrão).
- https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
  (`Type=oneshot`; o `ExecStart=` aceita os especificadores `%`).
- https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
  (`%h` é a pasta do usuário; `~/.config/systemd/user/`).
- https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html
  (`WantedBy=timers.target` no `[Install]` do timer).
