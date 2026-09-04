# BlueLab Status

Página de status do Blue que também funciona como fonte única das atualizações da página de status da Espelunca. O código roda em Cloudflare Workers e mantém o histórico em D1.

## Arquitetura

O Blue é o projeto-base deste diretório. A página nova é desenvolvida e validada primeiro como status do Blue. Depois, o mesmo código é publicado no ambiente da Espelunca, sem manter uma segunda cópia da interface.

Isso significa:

- `status-page/src/**` é a fonte única de layout, cálculo de uptime, incidentes e monitoramento;
- Blue e Espelunca usam o mesmo código;
- cada instância mantém configuração, Worker e banco D1 próprios;
- alterações de layout ou lógica feitas para o Blue podem ser publicadas também para a Espelunca pelo GitHub Actions;
- o histórico atual da Espelunca permanece no `espelunca-status-db`;
- o Blue passa a usar seu próprio `blue-status-db` quando a página for publicada.

A página da Espelunca não depende de `mastodon.blue` estar online para funcionar. Ela recebe a mesma versão do código, mas continua sendo uma implantação independente. Isso evita que uma queda do Blue derrube também o status da Espelunca.

## Branding da instância

A página não mantém favicon ou logo específicos do Blue no código compartilhado.

O Worker consulta a própria instância configurada em `INSTANCE_URL` e:

- usa o favicon declarado no HTML da instância como favicon da página de status;
- usa os ícones publicados por `GET /api/v2/instance` para escolher a logo exibida ao lado do nome no topo;
- faz fallback para os ícones da API ou `/favicon.ico` quando necessário;
- serve esses arquivos pelo próprio Worker com cache, em `/favicon.ico`, `/instance-favicon` e `/instance-logo`;
- referencia `/instance-favicon` com uma versão na página para forçar navegadores que tenham armazenado em cache um favicon ausente ou antigo a buscar novamente o favicon da instância.

Assim, quando a mesma base for instalada na Espelunca, ela exibirá automaticamente o favicon e o ícone da Espelunca em vez dos do Blue.

## Preview local no Blue

Para testar sem alterar a instalação Mastodon do Blue e sem tocar na Cloudflare remota, use um worktree separado do repositório.

Primeiro teste:

```bash
git fetch https://github.com/lucascasanho/BlueLab.git main
git worktree add --detach "$HOME/blue-status-test" FETCH_HEAD
cd "$HOME/blue-status-test"
bash status-page/scripts/local-preview.sh
```

Se o worktree `~/blue-status-test` já existir, atualize somente ele:

```bash
cd "$HOME/blue-status-test" || exit 1
if [ -n "$(git status --porcelain)" ]; then
  echo "ERRO: o worktree de teste possui alterações locais."
  git status --short
  exit 1
fi
git fetch https://github.com/lucascasanho/BlueLab.git main
git reset --hard FETCH_HEAD
bash status-page/scripts/local-preview.sh
```

Depois abra `http://127.0.0.1:8787`.

O preview usa `wrangler.preview.jsonc`, uma configuração exclusiva para desenvolvimento local com um D1 local. Ela existe justamente para não depender do ID do futuro banco D1 remoto do Blue.

O script:

- recria somente o D1 local da preview;
- aplica as migrations localmente;
- carrega 90 dias de dados de demonstração;
- executa os testes da classificação do uptime e do branding;
- inicia o Worker local na porta 8787.

A demonstração deixa `Website & API` com três dias imperfeitos: `287/288` verificações OK aparece verde por permanecer acima de 99%; `280/288` aparece amarelo; e `270/288` aparece laranja. Nenhum deles aparece vermelho, pois vermelho fica reservado para um dia em que todas as verificações registradas falharam. O restante dos dias permanece verde. Nenhum dado remoto é modificado.

Para testar o handler agendado contra os endpoints públicos do Blue enquanto o preview estiver rodando, em outro terminal execute:

```bash
curl "http://127.0.0.1:8787/__scheduled?cron=*%2F5+*+*+*+*"
```

Depois atualize a página. O `Website & API` e o `Streaming API` serão consultados nos endpoints configurados para `mastodon.blue`. O componente de filas usa heartbeat e o armazenamento de mídia permanece manual nesta primeira versão.

Para encerrar o preview, use `Ctrl+C`. Para remover o worktree depois do teste:

```bash
cd "$HOME/blue"
git worktree remove "$HOME/blue-status-test"
```

## Correção das barras de uptime

As barras de 90 dias não tratam uma falha isolada como se o serviço tivesse ficado indisponível durante todo o dia:

- cinza: não há amostras para o dia;
- verde: disponibilidade diária de pelo menos 99%, desde que o monitor não tenha registrado um estado explicitamente degradado;
- amarelo: disponibilidade diária entre 95% e 99%, ou houve estado explicitamente degradado sem indisponibilidade;
- laranja: disponibilidade diária abaixo de 95%, mas não houve indisponibilidade durante todas as verificações do dia;
- vermelho: todas as verificações registradas naquele dia ficaram indisponíveis.

O percentual de uptime é disponibilidade, portanto verificações `degraded` continuam contando como serviço disponível no cálculo numérico, embora a barra possa ficar amarela para mostrar que houve degradação. Estados desconhecidos continuam fora do denominador.

Para monitores HTTP, uma única falha transitória de Cloudflare, Tunnel ou rede também não é gravada imediatamente como downtime: o Worker repete a verificação uma vez dentro da mesma amostra e só registra indisponibilidade se as duas tentativas consecutivas falharem. Isso reduz falsos negativos sem esconder uma queda persistente.

## Compatibilidade com a Espelunca

O schema replica as tabelas já usadas pela página existente: `components`, `checks`, `daily_stats`, `incidents`, `incident_updates` e `incident_components`.

O endpoint legado de heartbeat do Sidekiq também é aceito:

`POST /api/heartbeat/sidekiq`

com `Authorization: Bearer <token>`.

O token não deve ser versionado. Use o secret `STATUS_HEARTBEAT_TOKEN_ESPELUNCA` no GitHub.

## Publicação pelo GitHub

O workflow `.github/workflows/status-page.yml` testa a classificação das barras e o branding e pode publicar os ambientes `blue`, `espelunca` ou ambos.

Secrets necessários no repositório:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `STATUS_HEARTBEAT_TOKEN_ESPELUNCA` (quando o heartbeat da Espelunca for transferido)
- `STATUS_HEARTBEAT_TOKEN_BLUE` (quando o heartbeat do Blue for configurado)

A variável de repositório `STATUS_AUTODEPLOY=true` habilita publicação automática dos dois ambientes após alterações em `status-page/**`. Sem essa variável, o deploy continua disponível manualmente em GitHub Actions.

O fluxo pretendido é: desenvolver/testar no Blue -> publicar Blue -> depois publicar a mesma revisão para Espelunca. Assim, o Blue funciona como laboratório e fonte das atualizações, enquanto a Espelunca só recebe versões já verificadas.

## Domínio do Blue

O ambiente `blue` já declara `status.mastodon.blue` como Custom Domain do Cloudflare Worker. Quando o deploy do ambiente Blue for executado com credenciais Cloudflare válidas, o Wrangler poderá associar o Worker diretamente a esse hostname e a Cloudflare cuidará do DNS/certificado do Custom Domain.

A Espelunca permanece apontada para sua página atual até a nova revisão compartilhada ser validada no Blue e o cutover da Espelunca ser feito explicitamente.
