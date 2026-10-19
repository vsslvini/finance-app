#!/usr/bin/env bash
# Backup diário do banco de produção (docs/deploy.md, Fase 4). Guarda um
# arquivo por dia em ~/backups e apaga os de mais de 14 dias.
set -euo pipefail

cd "$HOME/app-financas"
# Lê POSTGRES_USER e POSTGRES_DB do .env de produção
set -a
source .env
set +a

mkdir -p "$HOME/backups"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$HOME/backups/financas-$(date +%F).dump"
find "$HOME/backups" -name 'financas-*.dump' -mtime +14 -delete
