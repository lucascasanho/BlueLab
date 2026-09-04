#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WRANGLER=(npx --yes wrangler@4.129.0)
CONFIG="wrangler.preview.jsonc"

printf '\n===== BlueLab Status — preview local =====\n'
printf 'Diretório: %s\n' "$ROOT"
printf 'Config local: %s\n\n' "$CONFIG"

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

cat <<'EOF'

===== PRONTO =====
Abra no navegador:
  http://127.0.0.1:8787

Este é o protótipo da futura página de status do Blue.
Ele usa somente D1 LOCAL e não publica nada na Cloudflare.
Também não altera mastodon.blue nem status.espelunca.social.

O Website & API foi semeado com:
  - um dia com 287/288 verificações OK -> amarelo;
  - um dia com 280/288 verificações OK -> laranja;
  - nenhum dia vermelho.

A base de código desta página será a fonte das futuras atualizações da página
da Espelunca; cada instância continuará usando banco e configuração próprios.

Para encerrar o preview: Ctrl+C
EOF

exec "${WRANGLER[@]}" dev \
  --config "$CONFIG" \
  --test-scheduled \
  --ip 127.0.0.1 \
  --port 8787
