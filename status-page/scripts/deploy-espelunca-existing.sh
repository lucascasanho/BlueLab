#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WRANGLER=(npx --yes wrangler@4.129.0)
CONFIG="wrangler.jsonc"
LEGACY_DIR="${ESPELUNCA_STATUS_LEGACY_DIR:-$HOME/espelunca-status}"
PUBLIC_URL="https://status.espelunca.social"
EXPECTED_DB_ID="3a2e3b58-4d52-466f-ab85-2c6ebb7c8df2"

extract_worker_name() {
  local file="$1"

  case "$file" in
    *.toml)
      sed -nE 's/^[[:space:]]*name[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$file" | head -n1
      ;;
    *.json|*.jsonc)
      grep -m1 -oE '"name"[[:space:]]*:[[:space:]]*"[^"]+"' "$file" \
        | sed -E 's/.*:[[:space:]]*"([^"]+)"/\1/'
      ;;
  esac
}

find_existing_worker() {
  local file name

  for file in \
    "$LEGACY_DIR/wrangler.toml" \
    "$LEGACY_DIR/wrangler.json" \
    "$LEGACY_DIR/wrangler.jsonc"; do
    if [ -f "$file" ]; then
      name="$(extract_worker_name "$file" || true)"
      if [ -n "$name" ]; then
        printf '%s' "$name"
        return 0
      fi
    fi
  done

  printf '%s' 'espelunca-status'
}

cloudflare_authenticated() {
  local output
  output="$("${WRANGLER[@]}" whoami 2>&1 || true)"

  if grep -qiE 'not authenticated|please run [`'"'"']?wrangler login|CLOUDFLARE_API_TOKEN' <<<"$output"; then
    return 1
  fi

  if grep -qiE 'account|email|token|oauth' <<<"$output"; then
    return 0
  fi

  return 1
}

printf '\n===== STATUS ESPELUNCA — ATUALIZAÇÃO PELO BLUELAB =====\n'
printf 'Código: %s\n' "$ROOT"
printf 'Config: %s\n' "$CONFIG"
printf 'D1 esperado: %s\n\n' "$EXPECTED_DB_ID"

WORKER_NAME="$(find_existing_worker)"
printf 'Worker detectado: %s\n' "$WORKER_NAME"

printf '\n===== 1/6 AUTENTICAÇÃO CLOUDFLARE =====\n'
if ! cloudflare_authenticated; then
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo 'CLOUDFLARE_API_TOKEN está definido, mas o Wrangler não conseguiu validar a autenticação.'
    echo 'Confira o token e tente novamente.'
    exit 1
  fi

  echo 'Wrangler ainda não está autenticado.'
  echo 'Vou iniciar o login por dispositivo da Cloudflare.'
  echo 'O terminal mostrará uma URL e um código; aprove a autorização no navegador.'
  echo
  "${WRANGLER[@]}" login --device
fi

echo
"${WRANGLER[@]}" whoami

if ! cloudflare_authenticated; then
  echo
  echo 'ERRO: o login não ficou disponível para o Wrangler.'
  echo 'Nada foi publicado.'
  exit 1
fi

printf '\n===== 2/6 CONFIRMANDO WORKER EXISTENTE =====\n'
if ! "${WRANGLER[@]}" deployments status --name "$WORKER_NAME" >/tmp/bluelab-status-espelunca-worker.txt 2>&1; then
  cat /tmp/bluelab-status-espelunca-worker.txt
  echo
  echo "ERRO: não consegui confirmar o Worker existente '$WORKER_NAME'."
  echo 'Nada foi publicado.'
  exit 1
fi
cat /tmp/bluelab-status-espelunca-worker.txt

printf '\n===== 3/6 CONFIRMANDO D1 EXISTENTE =====\n'
"${WRANGLER[@]}" d1 execute DB \
  --remote \
  --config "$CONFIG" \
  --env espelunca \
  --command "SELECT COUNT(*) AS components FROM components;"

echo
printf 'O banco acima deve ser o D1 existente da Espelunca: %s\n' "$EXPECTED_DB_ID"
printf 'Nenhuma migration será aplicada nesta atualização.\n'

printf '\n===== 4/6 VERIFICANDO PÁGINA ATUAL =====\n'
CURRENT_HTTP="$(curl -sS -o /tmp/bluelab-status-espelunca-before.html -w '%{http_code}' "$PUBLIC_URL/" || true)"
printf 'HTTP atual de %s/: %s\n' "$PUBLIC_URL" "$CURRENT_HTTP"
if [ "$CURRENT_HTTP" != '200' ]; then
  echo 'ERRO: a página pública atual não respondeu HTTP 200.'
  echo 'Nada foi publicado.'
  exit 1
fi

printf '\n===== 5/6 PUBLICANDO NOVO CÓDIGO NO MESMO WORKER =====\n'
"${WRANGLER[@]}" deploy \
  --config "$CONFIG" \
  --env espelunca \
  --name "$WORKER_NAME"

printf '\n===== 6/6 VALIDAÇÃO PÓS-DEPLOY =====\n'
sleep 3
HEALTH_HTTP="$(curl -sS -o /tmp/bluelab-status-espelunca-health.json -w '%{http_code}' "$PUBLIC_URL/health" || true)"
PAGE_HTTP="$(curl -sS -o /tmp/bluelab-status-espelunca-after.html -w '%{http_code}' "$PUBLIC_URL/" || true)"

printf 'HTTP /health: %s\n' "$HEALTH_HTTP"
printf 'HTTP /:       %s\n' "$PAGE_HTTP"

if [ -s /tmp/bluelab-status-espelunca-health.json ]; then
  echo
  echo 'Resposta de /health:'
  cat /tmp/bluelab-status-espelunca-health.json
  echo
fi

if [ "$HEALTH_HTTP" != '200' ] || [ "$PAGE_HTTP" != '200' ]; then
  echo
  echo 'ERRO: o deploy terminou, mas a validação pública não retornou HTTP 200.'
  echo "Worker atualizado: $WORKER_NAME"
  exit 1
fi

printf '\n===== CONCLUÍDO =====\n'
printf 'Worker atualizado: %s\n' "$WORKER_NAME"
printf 'Página: %s\n' "$PUBLIC_URL"
printf 'D1 preservado: %s\n' "$EXPECTED_DB_ID"
printf '%s\n' 'O código agora vem do BlueLab; o histórico da Espelunca permanece no banco existente.'
