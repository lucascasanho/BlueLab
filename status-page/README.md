# BlueLab Status

Página de status compartilhada para Blue e Espelunca, executada em Cloudflare Workers com histórico em D1.

## Objetivo

O código de apresentação e monitoramento é único. Os ambientes `blue` e `espelunca` usam configurações e bancos separados, então uma correção visual ou de lógica feita aqui pode ser publicada para as duas páginas sem duplicar código.

A Espelunca continua usando o banco D1 já existente (`espelunca-status-db`) para preservar o histórico. O Blue usa um D1 próprio (`blue-status-db`).

## Correção das barras de uptime

As barras de 90 dias não tratam uma falha isolada como se o serviço tivesse ficado indisponível durante todo o dia:

- cinza: não há amostras para o dia;
- verde: todas as verificações foram operacionais;
- amarelo: houve uma mistura de verificações operacionais e falhas/degradações;
- vermelho: todas as verificações registradas naquele dia ficaram indisponíveis.

O percentual de uptime continua sendo calculado a partir do total real de verificações operacionais dividido pelo total de verificações. Assim, a cor da barra e o percentual deixam de transmitir informações contraditórias.

## Compatibilidade com a Espelunca

O schema replica as tabelas já usadas pela página existente: `components`, `checks`, `daily_stats`, `incidents`, `incident_updates` e `incident_components`.

O endpoint legado de heartbeat do Sidekiq também é aceito:

`POST /api/heartbeat/sidekiq`

com `Authorization: Bearer <token>`.

O token não deve ser versionado. Use o secret `STATUS_HEARTBEAT_TOKEN_ESPELUNCA` no GitHub.

## Publicação pelo GitHub

O workflow `.github/workflows/status-page.yml` testa a classificação das barras e pode publicar os ambientes `blue`, `espelunca` ou ambos.

Secrets necessários no repositório:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `STATUS_HEARTBEAT_TOKEN_ESPELUNCA` (quando o heartbeat da Espelunca for transferido)
- `STATUS_HEARTBEAT_TOKEN_BLUE` (quando o heartbeat do Blue for configurado)

A variável de repositório `STATUS_AUTODEPLOY=true` habilita publicação automática dos dois ambientes após alterações em `status-page/**`. Sem essa variável, o deploy continua disponível manualmente em GitHub Actions e nenhuma página de produção é trocada só por adicionar este código ao repositório.

## Cutover seguro

A configuração não declara custom domains de propósito. Primeiro publique e valide os Workers `bluelab-status-blue` e `bluelab-status-espelunca` nos endereços `workers.dev`. Depois associe os domínios de status no painel da Cloudflare. Isso evita substituir a página atual da Espelunca antes da validação.

O domínio público do Blue também deve ser escolhido no momento do cutover, em vez de ficar hardcoded no código compartilhado.
