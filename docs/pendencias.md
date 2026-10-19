# Pendências

Lista de tarefas abertas. Marque com `[x]` ao terminar e apague o que perder o sentido.
Endereços reais e segredos não entram aqui (o repositório é público); eles ficam no servidor.

## Deploy: servidor (atualizado em 2026-10-18)

Estado completo em [`deploy.md`](deploy.md), seção "Estado do servidor".

- [ ] Publicar o HTTPS na rede Tailscale: `sudo tailscale serve --bg 8000` e conferir com
      `tailscale serve status` (nunca `funnel`).
- [ ] Timers rodarem sem login: `sudo loginctl enable-linger vinicius`.
- [ ] Conferir as regras do firewall: `sudo ufw status verbose` (esperado: entrada negada por
      padrão, SSH só da rede de casa).
- [ ] Criar o usuário do admin (interativo, num terminal SSH):
      `cd ~/app-financas && docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser`.
- [ ] Gerar o token de produção (`drf_create_token <usuário>`) e gravar, sem mostrar na tela, em
      `~/token-do-app.txt` e na linha `EXPO_PUBLIC_API_TOKEN` do `~/mobile.env.producao`.
- [ ] Testar pelo HTTPS: `/api/health/` (200), `/api/resumo/` com o token (200), admin com estilo
      e aceitando login, e `/api/health/` aberto no celular com o Tailscale ligado.
- [ ] Dados: cadastrar as conexões no admin (ids dos itens do Meu Pluggy) **ou** trazer o dump do
      computador de desenvolvimento e restaurar por cima do banco novo (que hoje só tem a estrutura).
- [ ] Primeira sincronização de verdade:
      `docker compose -f docker-compose.prod.yml exec web python manage.py sincronizar`
      (esperado: "Sincronizado: N conexões, ...").
- [ ] Cópia do backup fora do servidor (`~/backups`), por exemplo `rsync` pelo Tailscale para o
      computador, guardada com criptografia.
- [ ] `deploy/backup.sh`: os arquivos saem com permissão `664`; colocar `umask 077` no começo do
      script (a pasta pessoal já é `700`, então não é urgente).
- [ ] Decidir sobre o outro usuário do servidor, que está nos grupos `sudo` e `docker`: na
      prática ele consegue ler o banco e o `.env` com as chaves da Pluggy.
- [ ] Incluir o app na tabela de serviços do README do `alencar-server` (e, se quiser, no Homepage).
- [ ] Atualizar o `deploy/CLAUDE-SERVIDOR.md`: hoje ele proíbe commit e push no servidor, mas o
      servidor faz push; e as fases 1 a 4 já foram feitas.
- [ ] Opcional: HSTS (`W004` do `check --deploy`), já que o acesso é só por HTTPS.

## Deploy: app no celular (Fase 5, no computador de desenvolvimento)

Depende do `tailscale serve` e do token acima.

- [ ] Guardar o `.env` de desenvolvimento: `cp mobile/.env mobile/.env.dev`.
- [ ] Copiar o `.env` de produção: `scp vinicius@<servidor>:mobile.env.producao mobile/.env` e
      conferir o token com `grep -c '^EXPO_PUBLIC_API_TOKEN=.' mobile/.env` (1 = ok).
- [ ] Rodar os dois `curl` de conferência da seção "Estado do servidor" do `deploy.md`.
- [ ] Conferir na documentação do EAS se o `mobile/.env` (que está no `.gitignore`) vai para o
      build na nuvem, ou se as variáveis vão por `eas env:create` (ou usar `--local`).
- [ ] `eas build -p android --profile pessoal`, instalar o APK no celular e abrir com o Tailscale
      ligado.
- [ ] Voltar o `.env` de desenvolvimento: `cp mobile/.env.dev mobile/.env`.

## Depois

- [ ] Deploy automático no padrão do servidor (imagem no GHCR): [`planos/deploy-automatico.md`](planos/deploy-automatico.md).
- [ ] Os itens de "Próximos passos" do `CLAUDE.md` (RF22, RF10, metas, biometria, `jest-expo`).
