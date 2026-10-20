# Deploy no servidor caseiro

Roteiro escrito em 2026-10-18 para colocar o app no servidor de casa: o backend (Django + PostgreSQL)
rodando sozinho, 24 horas por dia, com sincronização automática e backup, e o app instalado no
celular sem depender do Expo Go nem do computador de desenvolvimento.

A Fase 0 (código) foi feita em 2026-10-18 (Módulo 20); as fases 1 a 4 foram feitas no servidor
caseiro na mesma noite (estado na seção "Estado do servidor", logo abaixo); falta a
Fase 5, no computador de desenvolvimento. Os comandos de ferramentas de fora (Docker, Tailscale, EAS) seguem a
documentação oficial de cada uma; os links estão em cada fase e a seção 9 junta todos. Confira lá
antes de rodar, porque as ferramentas mudam.

- [Deploy no servidor caseiro](#deploy-no-servidor-caseiro)
  - [Estado do servidor (2026-10-18)](#estado-do-servidor-2026-10-18)
  - [1. Como fica no final](#1-como-fica-no-final)
  - [2. Decisões e por quê](#2-decisões-e-por-quê)
  - [Fase 0: preparar o código (no computador de desenvolvimento)](#fase-0-preparar-o-código-no-computador-de-desenvolvimento)
  - [Fase 1: preparar o servidor](#fase-1-preparar-o-servidor)
  - [Fase 2: acesso seguro com Tailscale](#fase-2-acesso-seguro-com-tailscale)
  - [Fase 3: subir o backend](#fase-3-subir-o-backend)
  - [Fase 4: sincronização automática e backup](#fase-4-sincronização-automática-e-backup)
  - [Fase 5: o app no celular (APK)](#fase-5-o-app-no-celular-apk)
  - [Fase 6: atualizar depois](#fase-6-atualizar-depois)
  - [7. Checklist de segurança](#7-checklist-de-segurança)
  - [8. Quando der problema](#8-quando-der-problema)
  - [9. Fontes](#9-fontes)

## Estado do servidor (2026-10-18)

Para quem for fazer a Fase 5 (o APK) no computador de desenvolvimento.

**O `mobile/.env` pronto está no servidor**, em `~/mobile.env.producao` (`chmod 600`), com o
endereço real e o token de produção. Ele não fica no repositório porque o repositório é público.
No computador de desenvolvimento, na raiz do projeto:

```bash
cp mobile/.env mobile/.env.dev        # guarda o .env de desenvolvimento (o .gitignore cobre .env.*)
scp vinicius@<servidor>:mobile.env.producao mobile/.env
grep -c '^EXPO_PUBLIC_API_TOKEN=.' mobile/.env    # 1 = token preenchido; 0 = ainda falta no servidor
```

`<servidor>` é o nome do servidor na rede Tailscale (`tailscale status` no computador mostra). Não
abra o arquivo na conversa: ele tem o token.

O que tem dentro, para entender:

- `EXPO_PUBLIC_API_URL=https://<servidor>.<sua-rede>.ts.net`, **sem barra no fim**, porque o
  `mobile/src/api.ts` junta `${url}${caminho}` e os caminhos já começam com `/api/`. É HTTPS (pelo
  `tailscale serve`), o que importa porque o Android bloqueia HTTP comum em app instalado.
- `EXPO_PUBLIC_API_TOKEN`: o token de produção, diferente do de desenvolvimento (cópia em
  `~/token-do-app.txt` no servidor).

**Conferir antes do build** (do computador, com o Tailscale ligado):

```bash
URL=$(sed -n 's/^EXPO_PUBLIC_API_URL=//p' mobile/.env)
curl -s "$URL/api/health/"                                            # {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Token $(sed -n 's/^EXPO_PUBLIC_API_TOKEN=//p' mobile/.env)" \
  "$URL/api/resumo/"                                                  # 200
```

Se o primeiro falhar, o `tailscale serve` ainda não está ligado no servidor; se o segundo der
401, o token está errado ou vazio.

**Para o build em si:** o perfil `pessoal` do `mobile/eas.json` gera APK; o `app.json` já tem o
nome "Finanças" e o `package` definitivo. Antes do `eas build`, conferir o aviso do fim da Fase 5:
o `mobile/.env` está no `.gitignore`, e é preciso confirmar na documentação do EAS se ele é enviado
ao build na nuvem ou se as variáveis vão por `eas env:create` (ou usar `--local`). Depois do build,
voltar o `.env` de desenvolvimento (`cp mobile/.env.dev mobile/.env`). O celular já está na rede
Tailscale; com ele ligado, o Início deve carregar os dados do servidor.

**Como ficou o servidor** (diferente do plano original em dois pontos):

- O backend foi montado **no próprio servidor**, pelo roteiro (`~/app-financas`, `docker compose
  -f docker-compose.prod.yml up -d --build`). O servidor tem a regra de não guardar código; levar
  o app para o padrão dele (imagem no GHCR) está em
  [`planos/deploy-automatico.md`](planos/deploy-automatico.md), para depois.
- `.env` de produção com `DJANGO_DEBUG=False`, chave e senha novas (`chmod 600`); banco sem porta
  publicada; Django só em `127.0.0.1:8000`.
- Dados do desenvolvimento migrados em 2026-10-20 (`pg_dump` no computador, `pg_restore
  --no-owner` num banco recriado no servidor): usuário, conexões, transações, gastos fixos,
  dívidas e plano. O token de produção foi gerado de novo (`drf_create_token -r`), diferente do de
  desenvolvimento. Primeira sincronização ok ("Sincronizado: 3 conexões"). Daqui em diante, o
  banco do servidor é o de verdade.
- Timers do systemd do usuário ligados, com lingering: sincronização a cada 3 horas e backup
  diário em `~/backups` (rodaram sozinhos; restauração testada num banco à parte).
- HTTPS pelo `tailscale serve` ligado e testado (`/api/health/` 200, admin com estilo, `/api/resumo/`
  200 com o token). O próprio servidor não usa o DNS do Tailscale: para testar de dentro dele, use
  `curl --resolve <nome>:443:<ip-do-tailscale>`.
- `manage.py check --deploy`: avisos conhecidos e aceitos (`mail.E001`, o app não manda e-mail;
  `W008`, sem `SECURE_SSL_REDIRECT` de propósito; `W004`, HSTS fica para depois).

**Pendências:** em [`pendencias.md`](pendencias.md). O servidor está pronto para a Fase 5.

## 1. Como fica no final

```
Celular (app instalado, APK)
   │  HTTPS, só dentro da rede privada do Tailscale
   ▼
Servidor caseiro ── Tailscale (https://servidor.<sua-rede>.ts.net)
   │
   ├── Docker Compose
   │     ├── web: Django + Gunicorn (porta 8000, só local)
   │     └── db:  PostgreSQL (sem porta aberta para fora)
   │
   ├── timer do systemd: sincronizar a cada 3 horas
   └── timer do systemd: backup do banco todo dia
          │
          ▼
       Pluggy (o servidor só faz pedidos para fora)
```

## 2. Decisões e por quê

- **Tailscale em vez de abrir porta no roteador.** São dados financeiros. Com o Tailscale (uma
  rede privada entre os seus aparelhos, gratuita para uso pessoal), o backend não fica exposto na
  internet: só o seu celular e o seu computador, logados na mesma conta, conseguem falar com ele.
  Não precisa de domínio, de IP fixo nem de mexer no roteador, e o Tailscale entrega HTTPS com
  certificado válido. A alternativa (domínio + porta aberta + Caddy com Let's Encrypt) fica na
  Fase 2, como plano B, e pede mais cuidado com segurança.
- **Tudo em Docker Compose.** O banco já roda no Docker; o Django também passa a rodar num
  contêiner. Assim o servidor só precisa de Docker, e subir ou atualizar é um comando.
- **Gunicorn no lugar do `runserver`.** O `runserver` é só para desenvolvimento (a documentação
  do Django avisa que ele não é seguro nem feito para produção). O Gunicorn é o servidor de
  aplicação mais comum para Django. É uma **dependência nova** (`gunicorn`), só para produção.
- **WhiteNoise para os arquivos do admin.** Com `DEBUG=False`, o Django não serve mais CSS e JS
  do admin. O WhiteNoise faz o próprio Django servir esses arquivos, sem precisar de um Nginx.
  Também é **dependência nova** (`whitenoise`). O app em si não usa arquivos estáticos; isso é só
  para o admin continuar bonito.
- **APK instalado direto no celular.** O app é pessoal; não precisa de loja. O EAS Build (serviço
  da Expo, com plano gratuito) gera um APK que você instala no Android.

## Fase 0: preparar o código (no computador de desenvolvimento)

Estas mudanças entram no repositório antes do deploy, como um módulo normal (plano, testes,
commit). Nenhuma delas muda o comportamento em desenvolvimento.

1. **Dependências de produção** em `backend/requirements.txt` (versões fixadas com `==`, como o
   resto do projeto; conferir a versão atual no PyPI): `gunicorn` e `whitenoise`.
2. **`config/settings.py`:**
   - `STATIC_ROOT = BASE_DIR / "staticfiles"` (onde o `collectstatic` junta os arquivos do admin).
   - O middleware do WhiteNoise logo depois do `SecurityMiddleware`
     (`"whitenoise.middleware.WhiteNoiseMiddleware"`).
   - `CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])`, para o login
     do admin funcionar pelo endereço HTTPS do Tailscale.
   - Com `DEBUG=False`, ligar `SECURE_PROXY_SSL_HEADER` só se houver proxy na frente (no plano B);
     com o `tailscale serve`, conferir na documentação qual cabeçalho ele repassa.
3. **`backend/Dockerfile`** (imagem do Django):
   - base `python:3.14-slim` (a mesma versão do `.venv`);
   - copiar `requirements.txt`, `pip install --no-cache-dir -r requirements.txt`, copiar o código;
   - `python manage.py collectstatic --noinput` na hora de montar a imagem;
   - comando final: `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2`.
4. **`backend/.dockerignore`**: `.venv`, `__pycache__`, `.pytest_cache`, `.ruff_cache`, `*.pyc`.
5. **`docker-compose.prod.yml`** na raiz, com dois serviços:
   - `db`: igual ao `docker-compose.yml` de hoje, mas **sem** a seção `ports` (o banco só é
     acessado pelo `web`, pela rede interna do Docker) e com `restart: unless-stopped`;
   - `web`: `build: ./backend`, `env_file: .env`, `environment: POSTGRES_HOST: db` (dentro do
     Docker, o banco se chama `db`, não `localhost`), `depends_on` com `condition:
     service_healthy`, `ports: "127.0.0.1:8000:8000"` (só o próprio servidor alcança; o Tailscale
     publica para os seus aparelhos) e `restart: unless-stopped`.
6. **`deploy/systemd/`**: versões do serviço de sincronização e do backup que rodam dentro do
   contêiner (`docker compose -f docker-compose.prod.yml exec -T web python manage.py
   sincronizar`), além do timer que já existe.
7. **`mobile/eas.json`** com um perfil que gera APK (ver Fase 5) e, no `app.json`, `name` e
   `android.package` definitivos (ex.: `"name": "Finanças"`, `"package":
   "com.vinicius.financas"`). O `package` não pode mudar depois sem reinstalar o app.

Teste local antes de levar ao servidor: `docker compose -f docker-compose.prod.yml up --build`,
abrir `http://127.0.0.1:8000/api/health/` e o admin.

## Fase 1: preparar o servidor

Os comandos supõem Debian ou Ubuntu Server; em outra distribuição, troque o `apt` pelo
gerenciador dela.

1. **Sistema atualizado e usuário próprio** (não use o root no dia a dia):
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo adduser vinicius && sudo usermod -aG sudo vinicius
   ```
2. **SSH só com chave** (no computador: `ssh-copy-id vinicius@<ip-do-servidor>`; no servidor, em
   `/etc/ssh/sshd_config`: `PasswordAuthentication no` e `PermitRootLogin no`, depois
   `sudo systemctl restart ssh`). Teste uma nova conexão **antes** de fechar a atual.
3. **Firewall** (só SSH na rede de casa; o resto passa pelo Tailscale):
   ```bash
   sudo apt install -y ufw
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow from 192.168.80.0/24 to any port 22 proto tcp
   sudo ufw enable
   ```
   (Troque `192.168.80.0/24` pela faixa da sua rede, a mesma que você já usa no `ufw` do
   computador.)
4. **Docker Engine e o plugin Compose**, pelo repositório oficial da Docker (guia "Install Docker
   Engine on Debian/Ubuntu"). Depois: `sudo usermod -aG docker vinicius` e sair e entrar de novo.
   Conferir: `docker compose version`.
5. **Atualizações de segurança automáticas**: `sudo apt install -y unattended-upgrades` e
   `sudo dpkg-reconfigure unattended-upgrades`.
6. **Horário certo**: `timedatectl` deve mostrar o fuso e "System clock synchronized: yes". O app
   usa o fuso do Django (`America/Manaus`), mas os timers e logs usam o do servidor.

## Fase 2: acesso seguro com Tailscale

1. Crie a conta em tailscale.com e instale no servidor (script oficial):
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
   Abra o link que aparecer e autorize o servidor na sua conta.
2. Instale o app do Tailscale no celular (Play Store) e no computador, com a mesma conta.
3. No painel do Tailscale, ligue **MagicDNS** e **HTTPS Certificates** (seção DNS).
4. Publique o backend só para a sua rede privada, com HTTPS:
   ```bash
   sudo tailscale serve --bg 8000
   tailscale serve status
   ```
   O endereço fica parecido com `https://servidor.<nome-da-sua-rede>.ts.net`. Conferir a sintaxe
   atual do `tailscale serve` na documentação (ela mudou entre versões).
5. Teste do celular (com o Tailscale ligado nele): abrir
   `https://servidor.<sua-rede>.ts.net/api/health/` no navegador.

Não use `tailscale funnel`: ele publica na internet aberta, que é justamente o que queremos evitar.

**Plano B (sem Tailscale):** domínio próprio, IP fixo ou DNS dinâmico, porta 443 aberta no
roteador apontando para o servidor e o Caddy na frente do Django (o Caddy obtém o certificado
HTTPS sozinho). Nesse caso o backend fica exposto na internet: o token passa a ser a única
barreira, então vale limitar tentativas (ex.: `fail2ban`) e manter tudo atualizado. Só siga esse
caminho se precisar acessar o app sem o Tailscale.

## Fase 3: subir o backend

1. Copie o projeto para o servidor (o código vem do git; os segredos, não):
   ```bash
   git clone <url-do-repositório> ~/app-financas
   cd ~/app-financas
   ```
2. Crie o `.env` de produção a partir do `.env.example` (`cp .env.example .env` e
   `chmod 600 .env`). Diferenças em relação ao de desenvolvimento:
   - `DJANGO_DEBUG=False`;
   - `DJANGO_SECRET_KEY` **nova**, gerada no servidor:
     `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`;
   - `DJANGO_ALLOWED_HOSTS=servidor.<sua-rede>.ts.net,localhost,127.0.0.1`;
   - `DJANGO_CSRF_TRUSTED_ORIGINS=https://servidor.<sua-rede>.ts.net`;
   - `POSTGRES_PASSWORD` **nova** e forte;
   - `POSTGRES_HOST=db`;
   - as credenciais da Pluggy (as mesmas do Meu Pluggy).
3. Suba os dois contêineres:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml ps
   ```
4. Prepare o banco (uma vez):
   ```bash
   docker compose -f docker-compose.prod.yml exec web python manage.py migrate
   docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
   docker compose -f docker-compose.prod.yml exec web python manage.py drf_create_token <usuário>
   ```
   Guarde o token: ele vai para o app na Fase 5.
5. No admin (`https://servidor.<sua-rede>.ts.net/admin/`), cadastre as três conexões com os ids
   dos itens do Meu Pluggy, como foi feito no desenvolvimento.
6. Primeira sincronização:
   ```bash
   docker compose -f docker-compose.prod.yml exec web python manage.py sincronizar
   ```
   Esperado: "Sincronizado: 3 conexões, ...".
7. Os dados manuais do desenvolvimento (gastos fixos, dívidas, plano de guardar, categorias
   trocadas) não vêm sozinhos. Para levar tudo, use um backup do banco de desenvolvimento
   (`pg_dump` da Fase 4) e restaure no servidor **antes** do passo 4; ou cadastre de novo pelo app.

## Fase 4: sincronização automática e backup

1. **Sincronização a cada 3 horas**: o serviço do servidor é o
   `deploy/systemd/app-financas-sincronizar-docker.service` (chama o comando dentro do contêiner);
   ele é copiado com o nome sem "-docker", para o timer que já existe encontrá-lo. Como o servidor fica ligado e ninguém faz login
   nele, ative o "lingering" para os timers do usuário rodarem sem login:
   ```bash
   sudo loginctl enable-linger vinicius
   mkdir -p ~/.config/systemd/user
   cp deploy/systemd/app-financas-sincronizar-docker.service \
     ~/.config/systemd/user/app-financas-sincronizar.service
   cp deploy/systemd/app-financas-sincronizar.timer deploy/systemd/app-financas-backup.{service,timer} \
     ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now app-financas-sincronizar.timer app-financas-backup.timer
   systemctl --user list-timers
   ```
2. **Backup diário do banco** com `pg_dump`, guardando 14 dias:
   ```bash
   mkdir -p ~/backups
   docker compose -f ~/app-financas/docker-compose.prod.yml exec -T db \
     pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > ~/backups/financas-$(date +%F).dump
   find ~/backups -name 'financas-*.dump' -mtime +14 -delete
   ```
   Esses comandos já estão no `deploy/backup.sh`, que o `app-financas-backup.timer` roda todo dia
   (`OnCalendar=daily` com `Persistent=true`); ele é ligado junto no passo 1.
3. **Cópia fora do servidor**: um backup no mesmo disco não protege contra o disco queimar.
   Copie a pasta `~/backups` para outro lugar (o computador, por `rsync` pelo Tailscale, ou um
   serviço de nuvem com criptografia). O backup tem dados financeiros: guarde criptografado.
4. **Testar a restauração** pelo menos uma vez (backup que nunca foi restaurado não é garantia):
   ```bash
   docker compose -f docker-compose.prod.yml exec -T db \
     pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean < ~/backups/financas-AAAA-MM-DD.dump
   ```

## Fase 5: o app no celular (APK)

1. No `mobile/.env` usado para o build:
   - `EXPO_PUBLIC_API_URL=https://<servidor>.<sua-rede>.ts.net` (sem barra no fim)
   - `EXPO_PUBLIC_API_TOKEN=<token de produção>` (em `~/token-do-app.txt` no servidor; ver
     "Estado do servidor")

   As variáveis `EXPO_PUBLIC_` entram dentro do app na hora do build. Trocar o endereço ou o token
   exige um build novo. (Risco já aceito para uso pessoal: quem tiver o APK consegue ler o token.
   Com o Tailscale, mesmo com o token, só os seus aparelhos alcançam o servidor.)
2. Instale a ferramenta da Expo e entre na conta (gratuita):
   ```bash
   npm install -g eas-cli
   eas login
   cd mobile && eas build:configure
   ```
3. No `eas.json`, um perfil que gera APK (o padrão do Android gera AAB, que é para a loja):
   ```json
   {
     "build": {
       "pessoal": {
         "android": { "buildType": "apk" },
         "distribution": "internal"
       }
     }
   }
   ```
4. Gere e instale:
   ```bash
   eas build -p android --profile pessoal
   ```
   Ao terminar, o EAS mostra um link e um QR code; abra no celular, baixe o APK e instale
   (o Android pede para permitir "instalar apps desconhecidos" para o navegador).
5. Com o Tailscale ligado no celular, abra o app: o Início deve carregar com os dados do servidor.

Atenção às variáveis no EAS: o build roda na nuvem da Expo e só enxerga os arquivos enviados.
Conferir na documentação "Environment variables in EAS" se o `mobile/.env` é enviado (ele está no
`.gitignore`) ou se as variáveis devem ser cadastradas no EAS (`eas env:create`). Alternativa sem
nuvem: `eas build -p android --profile pessoal --local` (precisa do Android SDK no computador).

## Fase 6: atualizar depois

**Backend** (depois de um `git push` com mudanças):
```bash
cd ~/app-financas
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web python manage.py migrate
```
Faça um backup antes de atualizar quando houver migration nova.

**App**: um build novo (`eas build -p android --profile pessoal`) e instalar o APK por cima.
Mudanças só de JavaScript também podem ir pelo EAS Update, sem reinstalar (passo opcional,
conferir na documentação "EAS Update").

## 7. Checklist de segurança

- [ ] `DJANGO_DEBUG=False` em produção.
- [ ] `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD` e token **diferentes** dos de desenvolvimento.
- [ ] `.env` com `chmod 600` e fora do git.
- [ ] Banco sem porta publicada (`docker compose ... ps` não mostra `5432` para fora).
- [ ] Backend publicado só em `127.0.0.1:8000` e pelo `tailscale serve` (nunca `funnel`).
- [ ] SSH só com chave, sem root, e `ufw` ligado.
- [ ] Atualizações automáticas de segurança ligadas.
- [ ] Backup diário funcionando, com cópia fora do servidor e restauração testada.
- [ ] Chaves da Pluggy só no `.env` do servidor (nunca no app).

## 8. Quando der problema

| Sintoma | Onde olhar |
|---|---|
| App mostra erro de conexão | Tailscale ligado no celular? `tailscale status` no servidor; `curl http://127.0.0.1:8000/api/health/` no servidor |
| Erro 400 "Bad Request" | Endereço faltando em `DJANGO_ALLOWED_HOSTS` |
| Admin sem estilo | `collectstatic` não rodou ou WhiteNoise fora do middleware |
| Login do admin dá erro de CSRF | `DJANGO_CSRF_TRUSTED_ORIGINS` sem o endereço `https://` |
| Dados não atualizam | `systemctl --user list-timers`; `journalctl --user -u app-financas-sincronizar` |
| Contêiner reiniciando | `docker compose -f docker-compose.prod.yml logs web` |

## 9. Fontes

- Django, lista de verificação de deploy: https://docs.djangoproject.com/en/6.1/howto/deployment/checklist/
- Django com Gunicorn: https://docs.djangoproject.com/en/6.1/howto/deployment/wsgi/gunicorn/
- WhiteNoise: https://whitenoise.readthedocs.io/
- Docker Engine (instalação): https://docs.docker.com/engine/install/
- Docker Compose: https://docs.docker.com/compose/
- Tailscale (instalação, `serve`, HTTPS): https://tailscale.com/kb/
- systemd, timers e lingering: `man systemd.timer`, `man loginctl`
- PostgreSQL, `pg_dump` e `pg_restore`: https://www.postgresql.org/docs/17/app-pgdump.html
- EAS Build (APK, variáveis de ambiente, build local): https://docs.expo.dev/build/introduction/
