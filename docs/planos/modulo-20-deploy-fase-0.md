# Plano do Módulo 20: deploy, Fase 0 (código)

Pedido do Vinicius em 2026-10-18: o app pronto para uso o mais rápido possível. Este módulo é a
Fase 0 do [`../deploy.md`](../deploy.md), tudo o que entra no repositório antes de ir ao
servidor. As fases 1 a 5 rodam no servidor e ficam com o Vinicius (regra 8).

## Decisões

1. `gunicorn` 26.2.0 e `whitenoise` 6.12.0 (dependências novas já aprovadas no `deploy.md`).
2. `settings.py`: WhiteNoise logo depois do `SecurityMiddleware`, `STATIC_ROOT`,
   `CSRF_TRUSTED_ORIGINS` pelo `.env` e cookies só por HTTPS com `DEBUG=False`. Sem
   `SECURE_SSL_REDIRECT`: o `tailscale serve` fala com o Django por HTTP, e o redirecionamento
   entraria em laço.
3. `backend/Dockerfile` com Python 3.14 (a versão do `.venv`) e `collectstatic` no build, com
   variáveis de mentira só para o build.
4. `docker-compose.prod.yml`: banco sem porta publicada, Django só em `127.0.0.1:8000`.
5. `deploy/`: serviço de sincronização para Docker, `backup.sh` e timer diário do backup.
6. `mobile/app.json`: nome "Finanças", `package` `com.vinicius.financas` (não muda depois),
   tema do sistema escuro; `mobile/eas.json` com o perfil `pessoal` (APK).
7. Os ícones continuam os do Expo; trocar fica para depois (não impede o uso).

## Casos de teste (pytest)

1. O WhiteNoise vem logo depois do `SecurityMiddleware`.
2. `STATIC_ROOT` aponta para `backend/staticfiles`.
3. Sem `DJANGO_CSRF_TRUSTED_ORIGINS`, a lista fica vazia.

O Docker não roda nos testes; o teste do Docker é o da Fase 0 do `deploy.md`
(`docker compose -f docker-compose.prod.yml up --build` e abrir `/api/health/`).
