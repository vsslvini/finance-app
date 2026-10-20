# Pendências

Lista de tarefas abertas. Marque com `[x]` ao terminar e apague o que perder o sentido.
Endereços reais e segredos não entram aqui (o repositório é público); eles ficam no servidor.

## Deploy: servidor (atualizado em 2026-10-20)

Estado completo em [`deploy.md`](deploy.md), seção "Estado do servidor".

- [x] Publicar o HTTPS na rede Tailscale (`sudo tailscale serve --bg 8000`).
- [x] Timers rodarem sem login (`sudo loginctl enable-linger vinicius`).
- [x] Conferir o firewall: ativo, entrada negada por padrão.
- [ ] Firewall mais fechado que o de hoje: a porta 22 (SSH) e a 9090 (Cockpit) aceitam conexão de
      qualquer origem, e o roteiro pedia SSH só da rede de casa. Não é urgente (o roteador não
      repassa portas e o SSH só aceita chave), e vale para o servidor inteiro, não só para o app.
- [x] Dados do desenvolvimento migrados (dump do computador restaurado no servidor).
- [x] Token de produção gerado de novo e gravado em `~/token-do-app.txt` e no
      `~/mobile.env.producao`.
- [x] Testado pelo HTTPS: `/api/health/` 200, admin com estilo, `/api/resumo/` 200 com o token.
- [x] Primeira sincronização: "Sincronizado: 3 conexões".
- [ ] Abrir o admin no navegador do computador e entrar com o usuário de desenvolvimento (ele veio
      no dump, com a mesma senha). Se a senha for fraca, trocar:
      `docker compose -f docker-compose.prod.yml exec web python manage.py changepassword <usuário>`.
- [ ] Abrir `/api/health/` no celular, com o Tailscale ligado.
- [ ] No computador, desligar a sincronização automática de desenvolvimento, para não chamar a
      Pluggy em dobro: `systemctl --user disable --now app-financas-sincronizar.timer`.
- [ ] Apagar `~/financas-dev.dump` do servidor (já restaurado; tem todos os dados financeiros) e
      também a cópia no computador, ou guardá-la criptografada.
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
