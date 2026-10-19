# Instruções para o Claude Code no servidor

Este arquivo é para o Claude Code rodando **no servidor caseiro**, depois do `git clone`. Para
começar, o Vinicius escreve:

> Leia `deploy/CLAUDE-SERVIDOR.md` e siga o roteiro.

O objetivo é executar as fases 1 a 4 do [`../docs/deploy.md`](../docs/deploy.md) (servidor,
Tailscale, backend, sincronização e backup) e deixar tudo pronto para a Fase 5 (APK), que roda no
computador de desenvolvimento. O `docs/deploy.md` é a referência; este arquivo diz **como** você
conduz e **onde parar e perguntar**.

## Regras

- Português do Brasil, sem travessão; explique cada passo em uma ou duas frases (o Vinicius é
  estudante e quer entender).
- Antes de cada fase, diga o que vai fazer e espere um "ok". Dentro da fase, siga sem perguntar,
  menos nos pontos marcados com **PARE**.
- Todo comando com `sudo` pede a senha: mostre o comando e peça para o Vinicius rodar com
  `! <comando>` no prompt, ou espere ele autorizar.
- Nunca mostre segredos na tela depois de gravados (`.env`, token, senhas). Gere, grave no `.env`
  com `chmod 600` e diga só onde estão.
- Nunca use `tailscale funnel`, nunca publique a porta do banco, nunca abra porta no roteador.
- Nada destrutivo sem perguntar: `docker compose down -v`, `pg_restore --clean`, apagar volumes,
  `ufw reset`.
- Confira a documentação oficial antes de comandos de ferramentas de fora (Docker, Tailscale):
  elas mudam. Se não conseguir confirmar, diga.
- Ao terminar cada fase, escreva o que foi feito e o que conferiu (saída dos comandos de teste).

## Fase 0: reconhecer o servidor

1. `cat /etc/os-release`, `whoami`, `pwd`, `df -h /`, `free -h`, `timedatectl`.
2. O que já existe: `docker --version`, `docker compose version`, `tailscale version`,
   `systemctl is-active ssh`, `sudo ufw status` (este com **PARE** para a senha).
3. Onde está o repositório. O `docs/deploy.md` e os arquivos de `deploy/systemd/` supõem
   `~/app-financas`; se o clone estiver em outro lugar, mova (`mv`) para `~/app-financas` ou
   ajuste os caminhos e avise.
4. Resuma: o que já está pronto, o que falta, e qual distribuição (os comandos supõem Debian ou
   Ubuntu; em outra, adapte e avise).

## Fase 1: preparar o servidor (`docs/deploy.md`, Fase 1)

- Atualizar o sistema, instalar `unattended-upgrades`, conferir o horário.
- Docker Engine e o plugin Compose pelo repositório oficial; colocar o usuário no grupo
  `docker` (o Vinicius precisa sair e entrar de novo, ou rodar `newgrp docker`).
- **PARE antes do SSH e do firewall.** Mudar `sshd_config` e ligar o `ufw` pode trancar o
  Vinicius para fora se ele estiver conectado por SSH. Pergunte:
  - se ele está no teclado do servidor ou por SSH;
  - se já tem chave SSH configurada (só desligue a senha depois de ele testar uma conexão nova
    com a chave);
  - qual é a faixa da rede de casa para a regra do `ufw` (ex.: `192.168.80.0/24`).
  Se ele preferir, pule o endurecimento do SSH por agora e anote como pendência.

## Fase 2: Tailscale (`docs/deploy.md`, Fase 2)

1. Instalar pelo script oficial e rodar `sudo tailscale up`. **PARE**: o comando mostra um link;
   o Vinicius abre no navegador e autoriza o servidor na conta dele.
2. **PARE**: peça para ele ligar no painel do Tailscale o MagicDNS e os HTTPS Certificates, e
   instalar o Tailscale no celular, com a mesma conta.
3. Anote o nome do servidor na rede (`tailscale status`, ou `tailscale status --json`), no
   formato `servidor.<rede>.ts.net`. Ele vai para o `.env` e para o app.
4. O `tailscale serve --bg 8000` fica para o fim da Fase 3, quando o backend estiver de pé.

## Fase 3: subir o backend (`docs/deploy.md`, Fase 3)

1. Criar o `.env` na raiz do projeto a partir do `.env.example`, com `chmod 600`:
   - `DJANGO_DEBUG=False`;
   - `DJANGO_SECRET_KEY` nova: `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`;
   - `POSTGRES_PASSWORD` nova e forte (mesmo comando, 32 caracteres bastam);
   - `POSTGRES_HOST=db`, `POSTGRES_PORT=5432`, `POSTGRES_DB` e `POSTGRES_USER` como no exemplo;
   - `DJANGO_ALLOWED_HOSTS=servidor.<rede>.ts.net,localhost,127.0.0.1`;
   - `DJANGO_CSRF_TRUSTED_ORIGINS=https://servidor.<rede>.ts.net`;
   - **PARE**: `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` vêm do Vinicius (painel do Meu
     Pluggy). Peça para ele colar direto no arquivo com um editor (`nano .env`), para os
     segredos não passarem pela conversa.
2. `docker compose -f docker-compose.prod.yml up -d --build` e `... ps` (os dois serviços
   "running"; o `db` "healthy").
3. **Dados do desenvolvimento.** **PARE** e pergunte se ele quer trazer os dados do computador
   (gastos fixos, dívidas, plano, categorias trocadas, conexões) ou começar vazio:
   - **trazer**: no computador de desenvolvimento ele gera um dump (`docker compose exec -T db
     pg_dump -U <usuário> -Fc <banco> > financas-dev.dump`) e copia para o servidor (`scp` ou
     pelo Tailscale). No servidor, com o banco ainda vazio:
     `docker compose -f docker-compose.prod.yml exec -T db pg_restore -U "$POSTGRES_USER"
     -d "$POSTGRES_DB" --no-owner < financas-dev.dump`, depois o `migrate` do passo 4. Os
     tokens e usuários vêm junto; mesmo assim, gere um token novo no passo 4 (`-r`) para o de
     desenvolvimento deixar de valer em produção.
   - **começar vazio**: siga o passo 4 e cadastre as conexões no admin (passo 6).
4. Banco:
   - `docker compose -f docker-compose.prod.yml exec web python manage.py migrate`
   - **PARE**: `createsuperuser` é interativo; peça para o Vinicius rodar com
     `! docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser`.
   - `... exec web python manage.py drf_create_token <usuário>` (com `-r` se veio do dump).
     Grave o token num arquivo `~/token-do-app.txt` com `chmod 600` e não mostre na tela; ele
     vai para o `mobile/.env` do computador de desenvolvimento.
5. Publicar: `sudo tailscale serve --bg 8000` (**PARE** para o sudo) e `tailscale serve status`.
   Conferir a sintaxe atual na documentação do Tailscale.
6. Testes:
   - `curl -s http://127.0.0.1:8000/api/health/` no servidor;
   - `curl -s https://servidor.<rede>.ts.net/api/health/`;
   - `curl -s -H "Authorization: Token $(cat ~/token-do-app.txt)" https://servidor.<rede>.ts.net/api/resumo/`
     (sem mostrar o token: use o arquivo, como aqui);
   - **PARE**: peça para o Vinicius abrir no celular, com o Tailscale ligado,
     `https://servidor.<rede>.ts.net/api/health/`, e o admin no navegador do computador (deve
     aparecer com estilo e aceitar o login).
   - Se começou vazio: no admin, cadastrar as conexões (ids dos itens do Meu Pluggy).
7. Primeira sincronização: `... exec web python manage.py sincronizar` (esperado:
   "Sincronizado: N conexões, ...").

## Fase 4: sincronização automática e backup (`docs/deploy.md`, Fase 4)

1. `sudo loginctl enable-linger $USER` (**PARE** para o sudo).
2. Copiar os timers (o serviço de Docker vai com o nome sem "-docker"):
   ```bash
   mkdir -p ~/.config/systemd/user
   cp deploy/systemd/app-financas-sincronizar-docker.service \
     ~/.config/systemd/user/app-financas-sincronizar.service
   cp deploy/systemd/app-financas-sincronizar.timer deploy/systemd/app-financas-backup.{service,timer} \
     ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now app-financas-sincronizar.timer app-financas-backup.timer
   systemctl --user list-timers
   ```
3. Testar os dois serviços na hora: `systemctl --user start app-financas-sincronizar.service` e
   `systemctl --user start app-financas-backup.service`; conferir com
   `journalctl --user -u app-financas-sincronizar -n 20` e `ls -lh ~/backups`.
4. Restauração: **PARE** e pergunte antes de testar (o `--clean` apaga e recria as tabelas).
   Sugira testar num banco à parte, por exemplo criando um banco `teste_restauracao` no mesmo
   contêiner e restaurando nele, e apagando depois.
5. Cópia do backup fora do servidor: proponha um jeito simples (ex.: `rsync` pelo Tailscale para
   o computador) e deixe como pendência se o Vinicius não quiser agora.

## Ao terminar

1. Rode o checklist de segurança da seção 7 do `docs/deploy.md` e mostre cada item com o que
   conferiu (ex.: `docker compose -f docker-compose.prod.yml ps` sem `5432` publicado).
2. Entregue ao Vinicius, para a Fase 5 (APK) no computador de desenvolvimento:
   - o endereço `https://servidor.<rede>.ts.net`;
   - onde está o token (`~/token-do-app.txt`), para ele copiar com segurança (ex.: `scp`);
   - a lista do que ficou pendente (SSH, firewall, cópia externa do backup, restauração testada).
3. Não faça commit nem push no servidor: o servidor só recebe código (`git pull`). Mudanças nos
   arquivos do repositório, se precisar, ficam anotadas para o Vinicius levar ao computador de
   desenvolvimento.
