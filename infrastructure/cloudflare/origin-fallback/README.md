# BlueLab origin fallback

Worker autossuficiente que fica diante das páginas web do BlueLab e troca
somente erros de conectividade reconhecíveis por uma página de indisponibilidade.
Respostas normais são devolvidas como o mesmo objeto `Response`, sem reconstruir
corpo ou cabeçalhos.

## Escopo seguro

A página HTML só pode substituir uma navegação `GET` de documento. API,
WebSocket/streaming, uploads, federação, autenticação, assets e PWA têm Routes
mais específicas com Worker `None`, listadas em `routes.json`; portanto, nem
consomem uma invocação desse Worker. As demais respostas não HTML também são
devolvidas sem alteração.

Erros tratados:

- `520`, `521`, `522`, `523` e `524`, que são códigos de conectividade/origin
  gerados pela Cloudflare;
- `502` somente quando o corpo limitado a 16 KiB contém a assinatura documentada
  do Cloudflare Tunnel (`Unable to reach the origin service` ou `cloudflared`);
- `530` somente quando o corpo contém `error code: 1033`, isto é, nenhum
  conector saudável do Tunnel;
- exceção lançada pelo `fetch(request)`, somente com HTML para navegação de
  documento; chamadas não HTML recebem um `502` vazio.

Não são substituídos `401`, `403`, `404`, `422`, `500`, `503`, `504`, outros
`502`, outros `530` nem nenhum erro HTTP comum do Mastodon/nginx.

## Plano Free e desenho das Routes

O Workers Free permite 100.000 invocações por dia por conta. Na consulta de
2026-09-04, o tráfego agregado das duas zonas chegou a 107.991 requisições em
2026-08-29 e 129.261 em 2026-08-31. Por isso, não é seguro executar o Worker em
API, federação e arquivos estáticos apenas para retornar a mesma resposta.

Aplicando as exceções de `routes.json` aos grupos de paths observados, o maior
volume combinado nos sete dias foi 29.310 invocações/dia. A Route principal
também deve ser criada com `request_limit_fail_open: true`: se o limite gratuito
for atingido, o Mastodon continua direto ao origin, apenas sem a página
personalizada naquele período.

## Deploy

O deploy do código não gerencia Routes. Essa separação impede que um futuro
`wrangler deploy` apague as exceções `None` ou recrie a Route principal em modo
fail-closed.

```sh
cd infrastructure/cloudflare/origin-fallback
npm test
npm run check
npm run deploy
```

No canal de testes, aplicar somente as Routes de `mastodon.blue`. A Espelunca
permanece declarada, mas desativada até aprovação explícita do lote no Blue.

Ordem recomendada por zona:

1. criar todas as `bypass_routes` com `script: null`;
2. criar `{hostname}/*` com `script: bluelab-origin-fallback` e
   `request_limit_fail_open: true`;
3. confirmar a lista de Routes pela API antes de testar.

## Rollback

O rollback imediato é remover somente a Route principal
`mastodon.blue/*`/`espelunca.social/*`. As exceções `None` podem permanecer sem
efeito ou ser removidas depois. Nenhuma mudança de DNS ou Tunnel é necessária.

Se o código precisar voltar e a Route continuar ativa:

```sh
cd infrastructure/cloudflare/origin-fallback
npx --yes wrangler@4.129.0 rollback
```

## Estado anterior registrado em 2026-09-04

- não havia Worker Route em `mastodon.blue` nem `espelunca.social`;
- os dois apex eram CNAMEs proxied para seus respectivos `cfargotunnel.com`;
- Tunnel `blue`: saudável, quatro conexões, ingress `mastodon.blue` para
  `http://127.0.0.1:8080`, fallback `http_status:404`;
- Tunnel `espelunca`: saudável, quatro conexões, ingress `espelunca.social`
  para `http://127.0.0.1:80`, fallback `http_status:404`;
- Workers existentes: `bluelab-status-blue` e `espelunca-status`.

Esse registro é suficiente para conferir e reverter a alteração sem tocar em
DNS ou na configuração dos túneis.

## Referências da Cloudflare

- [Workers Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Workers: limites do plano Free](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers: preços e contagem de requisições](https://developers.cloudflare.com/workers/platform/pricing/)
- [`fetch()` e tratamento explícito de falhas de origin](https://developers.cloudflare.com/workers/runtime-apis/context/#passthroughonexception)
- [Erros comuns do Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/troubleshoot-tunnels/common-errors/)
- [Erros 5xx gerados pela Cloudflare](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/)
