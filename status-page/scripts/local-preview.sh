#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WRANGLER=(npx --yes wrangler@4.57.0)

printf '\n===== BlueLab Status — preview local =====\n'
printf 'Diretório: %s\n\n' "$ROOT"

printf '1/4 Limpando apenas o D1 local desta preview...\n'
rm -rf .wrangler/state

printf '2/4 Aplicando migrations no D1 local...\n'
"${WRANGLER[@]}" d1 migrations apply DB \
  --local \
  --config wrangler.jsonc \
  --env blue

printf '3/4 Carregando dados de demonstração...\n'
"${WRANGLER[@]}" d1 execute DB \
  --local \
  --config wrangler.jsonc \
  --env blue \
  --file preview/seed.sql

printf '4/4 Executando testes da lógica de uptime...\n'
node --test test/*.test.js

cat <<'EOF'

===== PRONTO =====
Abra no navegador:
  http://127.0.0.1:8787

O preview usa somente D1 LOCAL.
Não altera mastodon.blue, Cloudflare remoto ou status.espelunca.social.

O Website & API foi semeado com:
  - um dia com 287/288 verificações OK -> amarelo;
  - um dia com 280/288 verificações OK -> laranja;
  - nenhum dia vermelho.

Isso serve para confirmar visualmente que uma falha parcial não pinta o dia
inteiro de vermelho enquanto o uptime permanece positivo.

Para encerrar o preview: Ctrl+C
EOF

exec "${WRANGLER[@]}" dev \
  --config wrangler.jsonc \
  --env blue \
  --test-scheduled \
  --ip 127.0.0.1 \
  --port 8787
