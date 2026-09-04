#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WRANGLER=(npx --yes wrangler@4.129.0)
CONFIG="wrangler.preview.jsonc"
PORT="${STATUS_PREVIEW_PORT:-8787}"

port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltnH | awk '{print $4}' | grep -Eq "(^|:)${1}$"
    return
  fi

  return 1
}

while port_in_use "$PORT"; do
  PORT=$((PORT + 1))
done

printf '\n===== BlueLab Status — preview local =====\n'
printf 'Diretório: %s\n' "$ROOT"
printf 'Config local: %s\n' "$CONFIG"
printf 'Porta local: %s\n\n' "$PORT"

printf '1/4 Limpando apenas o D1 local desta preview...\n'
rm -rf .wrangler/state

printf '2/4 Aplicando migrations no D1 local...\n'
"${WRANGLER[@]}" d1 migrations apply DB \
  --local \
  --config "$CONFIG"

printf '3/4 Carregando dados de demonstração...\n'
"${WRANGLER[@]}" d1 execute DB \
  --local \
  --config "$CONFIG" \
  --file preview/seed.sql

printf '4/4 Executando testes da lógica de uptime...\n'
node --test test/*.test.js

printf '\n===== PRONTO =====\n'
printf 'Abra no navegador:\n'
printf '  http://127.0.0.1:%s\n\n' "$PORT"
printf '%s\n' 'Este é o protótipo da futura página de status do Blue.'
printf '%s\n' 'Ele usa somente D1 LOCAL e não publica nada na Cloudflare.'
printf '%s\n\n' 'Também não altera mastodon.blue nem status.espelunca.social.'
printf '%s\n' 'O Site e API foi semeado com:'
printf '%s\n' '  - um dia com 287/288 verificações OK -> amarelo;'
printf '%s\n' '  - um dia com 280/288 verificações OK -> laranja;'
printf '%s\n\n' '  - nenhum dia vermelho.'
printf '%s\n' 'A base de código desta página será a fonte das futuras atualizações da página'
printf '%s\n\n' 'da Espelunca; cada instância continuará usando banco e configuração próprios.'
printf '%s\n' 'Para encerrar o preview: Ctrl+C'

exec "${WRANGLER[@]}" dev \
  --config "$CONFIG" \
  --test-scheduled \
  --ip 127.0.0.1 \
  --port "$PORT"
