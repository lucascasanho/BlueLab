#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WRANGLER=(npx --yes wrangler@4.129.0)
CONFIG="wrangler.jsonc"
PUBLIC_URL="https://status.mastodon.blue"
WORKER_URL="https://bluelab-status-blue.espelunca.workers.dev"

printf '\n===== STATUS BLUE — ATUALIZAÇÃO PELO BLUELAB =====\n'
printf 'Código: %s\n' "$ROOT"
printf 'Página: %s\n\n' "$PUBLIC_URL"

printf '===== 1/4 VALIDANDO AUTENTICAÇÃO CLOUDFLARE =====\n'
"${WRANGLER[@]}" whoami

printf '\n===== 2/4 APLICANDO MIGRATIONS DO BLUE =====\n'
"${WRANGLER[@]}" d1 migrations apply DB \
  --remote \
  --config "$CONFIG" \
  --env blue

printf '\n===== 3/4 PUBLICANDO WORKER =====\n'
"${WRANGLER[@]}" deploy \
  --config "$CONFIG" \
  --env blue

printf '\n===== 4/4 VALIDANDO PÁGINA =====\n'
WORKER_HTTP="$(curl -sS -o /tmp/bluelab-status-blue-health.json -w '%{http_code}' "$WORKER_URL/health" || true)"
PUBLIC_HTTP="$(curl -sS -o /tmp/bluelab-status-blue-page.html -w '%{http_code}' "$PUBLIC_URL/" || true)"
printf 'Worker /health: %s\n' "$WORKER_HTTP"
printf 'Domínio público: %s\n' "$PUBLIC_HTTP"

if [ "$WORKER_HTTP" != '200' ]; then
  echo 'ERRO: o Worker publicado não respondeu HTTP 200.'
  exit 1
fi

if [ "$PUBLIC_HTTP" != '200' ]; then
  echo 'O Worker está publicado, mas o Custom Domain ainda não respondeu HTTP 200.'
  echo 'Aguarde a ativação/propagação do domínio e execute este comando novamente para validar.'
  exit 1
fi

printf '\n===== CONCLUÍDO =====\n'
printf 'Página: %s\n' "$PUBLIC_URL"
