# Plano futuro: deploy automático no alencar-server

Escrito em 2026-10-18, no servidor, durante a primeira subida do backend. **Ainda não é para
fazer**: por agora o Vinicius escolheu o caminho mais simples (build no próprio servidor, seguindo
o [`../deploy.md`](../deploy.md) ao pé da letra). Este plano diz como levar o app para o padrão do
servidor quando houver tempo.

## Como está hoje (simples, manual)

- O repositório está clonado em `~/app-financas` no servidor; a imagem do Django é montada aqui
  (`docker compose -f docker-compose.prod.yml up -d --build`).
- O `.env` de produção fica em `~/app-financas/.env` (`chmod 600`).
- O banco fica num volume do Docker (`app-financas_postgres_data`), que já mora no HD, porque o
  Docker do servidor guarda tudo em `/srv/dados/docker`.
- Sincronização e backup pelos timers do systemd do usuário (`deploy/systemd/`), com lingering.
- O HTTPS sai pelo `tailscale serve` (`https://<servidor>.<sua-rede>.ts.net`).
- Atualizar é a Fase 6 do `deploy.md`: `git pull`, `up -d --build` e `migrate`, à mão.

## Por que mudar um dia

O servidor tem uma regra própria (`~/alencar-server/docs/alencar-server/07-arquitetura.md`):
**código não mora no servidor**. O GitHub Actions monta a imagem, publica no GHCR, e o servidor
só baixa a imagem pronta. Cada app fica em `/srv/dados/apps/<nome>/`, com `compose.yaml`
versionado no repositório `alencar-server` e `.env` e dados só no servidor. O app de finanças é
hoje a exceção.

Ganhos: atualizar vira "dar push e esperar"; o servidor fica só com Docker (meta do guia 07);
cada imagem tem o número do commit, o que facilita voltar para a versão anterior.

## Como vai ficar

```
push no finance-app (backend/ mudou)
  └─ GitHub Actions, NA NUVEM do GitHub
       testes e lint → monta a imagem → ghcr.io/vsslvini/app-financas-backend:latest e :<commit>

push no alencar-server (ou o Vinicius manda rodar)
  └─ runner no servidor
       copia apps/financas/compose.yaml para /srv/dados/apps/financas
       docker compose pull + up -d
```

## Passos (cada um vira um commit pequeno)

1. **Workflow da imagem no `finance-app`** (`.github/workflows/imagem-backend.yml`): roda em
   `ubuntu-latest`, só quando `backend/**` mudar (e no botão manual). Primeiro `pytest` (com um
   PostgreSQL de serviço do Actions) e `ruff`; só se passarem, monta e publica a imagem com as
   tags `latest` e o hash do commit.
   - **Segurança:** o `finance-app` é **público**. Este workflow nunca pode usar o runner do
     servidor (`self-hosted`): num repositório público, qualquer pull request rodaria código na
     máquina de casa. O runner continua só no `alencar-server`, que é privado.
   - Conferir na documentação do GitHub se o pacote nasce privado no GHCR; se nascer, deixar
     público nas configurações do pacote (a imagem não tem segredos; o código já é público) ou
     fazer `docker login ghcr.io` no servidor com um token só de leitura.
2. **App no `alencar-server`** (`apps/financas/compose.yaml` e `.env.example`), no mesmo
   formato do Nextcloud:
   - `db`: PostgreSQL 17, dados em `./banco` (bind mount, como o Nextcloud);
   - `web`: a imagem do GHCR, `127.0.0.1:8000:8000`;
   - `sincronizar`: a mesma imagem, com um laço simples (`sleep 300`, depois
     `python manage.py sincronizar` a cada 3 horas), como o `nextcloud-cron`;
   - `backup`: imagem do PostgreSQL com um laço diário de `pg_dump` para
     `/home/vinicius/backups/financas` (SSD, outro disco que não o do banco), apagando os de mais
     de 14 dias, rodando com `user: "1000:1000"` para os arquivos serem do Vinicius.
   - Com isso, os timers do systemd e o lingering deixam de ser necessários.
3. **`scripts/deploy.sh` do `alencar-server`**: copiar o `compose.yaml` do financas e incluir
   `financas` no laço de `pull` e `up -d`. Se o `.env` não existir, pular o app com um aviso,
   para não quebrar o deploy dos outros.
4. **Migração dos dados** (uma vez, com o servidor parado para o app):
   1. backup novo (`deploy/backup.sh`);
   2. `docker compose -f docker-compose.prod.yml down` em `~/app-financas` (**sem** `-v`: o
      volume antigo fica guardado até tudo funcionar);
   3. mover o `.env` para `/srv/dados/apps/financas/.env` (`chmod 600`), trocando
      `POSTGRES_HOST` se precisar (continua `db`);
   4. subir só o `db` novo, `pg_restore --no-owner` do backup, subir o resto, `migrate`;
   5. desligar os timers (`systemctl --user disable --now app-financas-sincronizar.timer
      app-financas-backup.timer`);
   6. conferir app, admin e um backup novo; só depois de alguns dias apagar o volume antigo e o
      clone `~/app-financas`.
5. **Migrations no deploy**: decidir entre continuar à mão (`docker compose exec web python
   manage.py migrate`, como hoje) ou rodar `migrate` sozinho ao subir o `web`. Recomendação:
   à mão, com backup antes, enquanto o app for de uma pessoa só.
6. **Atualizar o app quando só o `finance-app` mudar**: o deploy do servidor roda a cada push
   no `alencar-server`. Opções, da mais simples para a mais automática:
   - à mão: `cd /srv/dados/apps/financas && docker compose pull && docker compose up -d`;
   - botão "Run workflow" do Deploy no `alencar-server`;
   - o workflow do `finance-app` avisar o `alencar-server` (`repository_dispatch`, precisa de um
     token guardado nos segredos do GitHub). Só se o manual incomodar.
7. **Documentos**: README do `alencar-server` (tabela de serviços e link no Homepage),
   `docs/deploy.md` (Fase 3 e Fase 6 novas) e um `docs/estudos/modulos/` do módulo.

## Casos de teste

- O workflow falha e não publica imagem quando um teste ou o lint falha.
- O pacote no GHCR tem as tags `latest` e o hash do commit.
- Um push no `alencar-server` sem `.env` do financas não quebra o deploy dos outros apps.
- Depois da migração: `/api/health/` e `/api/resumo/` respondem pelo Tailscale, o admin tem
  estilo e aceita login, e os totais do Início batem com os de antes.
- O contêiner `sincronizar` escreve "Sincronizado: N conexões" no `docker compose logs`.
- Aparece um arquivo novo em `~/backups/financas` no dia seguinte, e ele restaura num banco à
  parte.
- Voltar uma versão: trocar `latest` pelo hash anterior no `compose.yaml` e `up -d`.

## Versão mais simples

Ficar como está e só escrever um `deploy/atualizar.sh` com os três comandos da Fase 6 (`git pull`,
`up -d --build`, `migrate`), rodado à mão pelo SSH. Resolve o "atualizar dá trabalho" sem GHCR nem
workflow; o que não resolve é a regra do servidor de não guardar código.
