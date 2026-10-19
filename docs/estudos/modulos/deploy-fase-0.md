# Módulo 20: deploy, Fase 0

Escrito em 2026-10-18. A parte do deploy que mora no código. Plano em
[`../../planos/modulo-20-deploy-fase-0.md`](../../planos/modulo-20-deploy-fase-0.md); o roteiro
completo (servidor, Tailscale, APK) está em [`../../deploy.md`](../../deploy.md).

## 1. Por que cada arquivo

- **`backend/Dockerfile`**: a "receita" da imagem do Django. Copia primeiro só o
  `requirements.txt` e instala, depois o código: se as dependências não mudaram, o Docker
  reaproveita essa etapa e o build fica rápido. O `collectstatic` roda no build e precisa de
  variáveis de ambiente só porque o `settings.py` as exige; ali valem valores de mentira.
- **`backend/.dockerignore`**: o que não entra na imagem (`.venv`, caches).
- **`docker-compose.prod.yml`**: o banco sem `ports` (nada de fora alcança o PostgreSQL) e o
  Django em `127.0.0.1:8000` (só o próprio servidor; o Tailscale publica para os seus aparelhos).
  Dentro do Docker o banco se chama `db`, por isso `POSTGRES_HOST: db`.
- **`settings.py`**:
  - WhiteNoise: com `DEBUG=False`, o Django não serve o CSS do admin; o WhiteNoise serve.
  - `CSRF_TRUSTED_ORIGINS`: sem ele, o login do admin pelo endereço `https://` do Tailscale dá
    erro de CSRF.
  - Cookies seguros só com `DEBUG=False`: no desenvolvimento o admin é aberto por `http://`.
- **`deploy/`**: o serviço da sincronização que roda o comando dentro do contêiner
  (`docker compose exec -T`; o `-T` porque o systemd não tem terminal), o `backup.sh` com
  `pg_dump` e o timer diário.
- **`mobile/eas.json`**: o perfil `pessoal` gera APK (o padrão do Android é AAB, que é para a
  loja). O `app.json` ganhou nome e `package` definitivos.

## 2. Os testes

`backend/core/tests/test_settings.py` confere a posição do WhiteNoise, o `STATIC_ROOT` e que a
falta de `DJANGO_CSRF_TRUSTED_ORIGINS` vira lista vazia. O aviso "No directory at staticfiles"
do WhiteNoise nos testes é esperado (a pasta só existe no Docker) e foi silenciado no
`pyproject.toml`.

## 3. Para testar à mão

No computador (precisa de um `.env` com `DJANGO_DEBUG=False` para ver como no servidor):

```fish
docker compose -f docker-compose.prod.yml up --build
```

Depois abrir `http://127.0.0.1:8000/api/health/` e `http://127.0.0.1:8000/admin/` (com estilo).
Atenção: o banco do compose de produção é outro volume, vazio; rode o `migrate` nele.
