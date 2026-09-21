# Progresso — sistema de atualização BlueLab

## Objetivo geral

Reduzir acoplamento do fork BlueLab ao Mastodon e construir atualização upstream
transacional, validada por manifesto, sem promoção ou acesso à Espelunca.

## Fase atual

Fases 0–2 concluídas, validadas e promovidas. A fase seguinte iniciou a validação
executável do manifesto, sem alterar a rotina de atualização ativa.

## Último checkpoint concluído

Em 2026-09-20, o canal remoto `bluelab/BlueLab-Test` foi confirmado em
`f4cfc66ab3b697ea1ac10df0b0a9e6ae65577b87`, com checkout limpo no Blue. O comando
`blue-atualizar` foi executado de forma idempotente nesse SHA: dependências Ruby e
JavaScript foram verificadas, migrations executadas sem pendências, os domínios
descartáveis foram sincronizados sem novos bloqueios, assets foram recompilados e os
serviços foram reiniciados. `blue-web`, `blue-sidekiq` e `blue-streaming` ficaram
ativos; o healthcheck local `http://127.0.0.1:3000/health` respondeu `OK`.

Na verificação posterior do mesmo dia, os três serviços continuavam ativos; os
healthchecks local e público do Blue responderam `OK`/HTTP 200. O atualizador da
página de status foi executado sem migrations pendentes e a página pública
`https://status.mastodon.blue` respondeu HTTP 200. Essa verificação não promoveu
`BlueLab` nem acessou a Espelunca.

A proteção inicial permanece rastreável no SHA
`8300c26ed840eec984932a55a2a027392b98e96c`, com a referência local
`backup/bluelab-before-update-system-20260920`. O complemento do inventário foi
consolidado em `31ae6ac1b8`; sua validação confirmou 21 domínios e os nove caminhos de
teste declarados nas cinco novas entradas.

## Último commit criado

O último commit funcional do lote é `f4cfc66ab3 Install web readiness override during
updates`. Desde o checkpoint anterior, o lote contém:

- `238ccff760 bluelab-update: isolate Blue2 shell labels`;
- `c960306a39 Add Puma systemd readiness reporting`;
- `fcb6aded72 Fix systemd Puma readiness wrapper`;
- `f4cfc66ab3 Install web readiness override during updates`.

## Arquivos já migrados

- `app/javascript/mastodon/features/blue2/locale.ts` foi movido sem alterações de
  conteúdo para `app/javascript/bluelab/i18n/blue2.ts`.
- Os seis consumidores passaram a importar o contrato BlueLab: navegação e right
  rail Blue2, columns area, cabeçalho e painel de navegação, e direct timeline.
- `app/javascript/bluelab/i18n/blue2.test.ts` cobre normalização de locale regional
  e fallback para inglês.
- `bin/mastodon-systemd-puma`, `dist/mastodon-web.service` e
  `bin/mastodon-install-systemd-readiness` passaram a reportar e aguardar a prontidão
  do Puma para o systemd; `blue-atualizar` e `bluelab` instalam essa proteção antes do
  restart do web.

## Arquivos pendentes

O catálogo `blue2Text` não tem pendências. Os demais módulos de shell continuam
pendentes de análise própria; nenhum deles está autorizado a migrar por extensão
deste checkpoint.

## Problemas encontrados

- O fork possui 1.188 commits próprios desde o ancestral comum; diferença Git não é
  sinônimo de funcionalidade BlueLab.
- `bin/bluelab` atual inclui operações de árvore ativa e reset; não deve ser usado
  como base transacional sem refatoração posterior.
- Há um worktree prunable histórico em `/tmp/bluelab-pr106`; não foi alterado.

## Decisões arquiteturais

- Inventariar por domínio funcional e evidência, usando `bluelab/manifest.yml` como
  catálogo operacional; não mover código durante fases 0–2.
- Tratar AUTH/SECURITY/DATABASE como revisão semântica obrigatória.
- Preservar módulos já isolados e reduzir primeiro pontos B, sem copiar arquivos
  upstream inteiros.

## Testes executados

- `git status --short --branch` inicial: limpo.
- `git fetch upstream --tags --prune`: concluído.
- `git merge-base HEAD upstream/main`: `c9b78c464b99f6c0b6b28e2f6b174a9ef0faa55f`.
- Inventário de diff: 789 caminhos (379 A, 410 M); a primeira passagem registrou 16
  domínios e identificou quatro domínios sub-representados para complemento.
- YAML do manifesto carregado por Ruby/Psych e todos os caminhos de testes declarados
  foram confirmados no checkout.
- Validação complementar: as cinco entradas novas (`public-homepage-and-onboarding`,
  `content-retention`, `account-role-verification`, `pwa-and-client-assets` e
  `deployment-and-maintenance`) totalizam nove caminhos de teste existentes.
- Leitura da entrada `blue2-shell-navigation`: o catálogo `blue2Text` tem seis
  consumidores, contrato síncrono tipado e nenhuma dependência de estado, rota ou
  ação; foi registrado como a primeira fronteira B de baixo risco.
- `yarn test:js run app/javascript/bluelab/i18n/blue2.test.ts --reporter=verbose`:
  2 testes passaram.
- `yarn test:js run` dos testes existentes de account menu e navigation panel:
  9 testes passaram.
- `yarn typecheck` e ESLint restrito aos oito arquivos TypeScript alterados: passaram.
- `git diff --check`: passou.
- Em 2026-09-20, `blue-atualizar` no SHA `f4cfc66` completou bundle check, `yarn
install --immutable`, migrations, sincronização de domínios, precompilação de
  assets e restart. Os avisos de peer dependencies do Yarn já eram conhecidos e não
  interromperam a instalação.
- Após o restart, os três serviços ficaram ativos. O journal registrou o Puma pronto
  em `http://127.0.0.1:3000/health`; a consulta HTTP ao healthcheck retornou `OK`.
- `ruby bin/bluelab-manifest-validate`: passou para o manifesto com 21 domínios.
- `ruby test/bluelab_manifest_validator_test.rb`: 3 testes e 6 asserções passaram;
  cobre manifesto válido, ID duplicado e caminho fora do repositório.
- O validador foi publicado em `BlueLab-Test` no SHA
  `4f6b4bd99e` e aplicado no Blue por `blue-atualizar`. Dependências, migrations,
  sincronização de domínios, assets e restart concluíram; `blue-web`,
  `blue-sidekiq` e `blue-streaming` ficaram ativos e o healthcheck retornou `OK`.
- `ruby test/bluelab_transaction_planner_test.rb`: 3 testes e 11 asserções passaram;
  confirma que a simulação preserva o checkout ativo, bloqueia caminhos sem domínio e
  classifica conflitos pelo manifesto.
- A primeira simulação real contra `upstream/main` encontrou 19 conflitos e retornou
  `NEEDS_SEMANTIC_REVIEW` sem tocar a árvore ativa. O relatório revelou que conflitos
  ainda não eram associados a domínios; a correção adiciona essa classificação e um
  teste específico de conflito antes da repetição da simulação.
- A correção foi publicada em `BlueLab-Test` no SHA `cd59fccfc2` e aplicada no Blue;
  serviços ativos e healthcheck `OK`. A repetição contra `upstream/main`
  (`398b542652`) voltou `NEEDS_SEMANTIC_REVIEW` com 19 conflitos e relatório em
  `$BLUELAB_STATE_DIR/transactions/`. Os caminhos foram classificados entre
  `rich-composer`, `blue2-shell-navigation`, `quotes-and-media-downloads` e
  `UNCLASSIFIED`; não houve merge, mudança de branch, serviço, banco ou Espelunca.

O hook local também executou `yarn i18n:extract`, que apontou diferenças já
existentes em `app/javascript/mastodon/locales/en.json` (chaves sem relação com este
catálogo). A árvore foi restaurada pelo hook e esse arquivo não integra o lote.

## Testes pendentes

Permanece pendente uma confirmação manual curta do candidato reconciliado
`ae79d9768aa076a9aa91a0d98c8654332e724b0b` no Blue. A árvore desse commit é idêntica
à do candidato antes da reconciliação, já aprovado visualmente; a confirmação deve
garantir que o Blue continua disponível após a implantação do novo SHA.

## Próximo passo exato

Em 2026-09-20, a validação manual do shell Blue2 no Blue foi aprovada explicitamente
para o SHA funcional `f4cfc66`. A promoção foi então reavaliada, mas não executada:
`BlueLab` (`e1e2672`) não é ancestral de `BlueLab-Test`. Os dois commits exclusivos
do estável são `f9ae9dfc41` e `e1e2672`, ambos ligados à ponte final do atualizador da
Espelunca e com alterações em `bin/bluelab`; o canal de testes tem 289 commits
exclusivos. Não usar force-push, reset ou cherry-pick para contornar a divergência.

Com autorização explícita, esses commits foram integrados sem conflitos no merge
`ae79d976`. A árvore resultante é exatamente igual à árvore de `BlueLab-Test` antes do
merge; a reconciliação adiciona somente a ancestralidade necessária, sem remover ou
alterar conteúdo funcional. O commit foi publicado e aplicado no Blue por
`blue-atualizar`: bundle check, `yarn install --immutable`, migrations, sincronização
de domínios, assets e restart concluíram. `blue-web`, `blue-sidekiq` e
`blue-streaming` ficaram ativos; Puma informou prontidão e o healthcheck respondeu
`OK`.

`bluelab/BlueLab` (`e1e2672`) agora é ancestral de `bluelab/BlueLab-Test`
(`ae79d976`), tornando possível uma promoção por fast-forward após a confirmação
manual do candidato reconciliado. `BlueLab` continua inalterada até essa aprovação.

Após confirmação manual explícita, a pré-verificação confirmou que
`BlueLab-Test` no commit `2dc5b74f572566acfed291ab7602a06be9c802d9` era descendente
de `BlueLab` e correspondia exatamente ao candidato aprovado. Em 2026-09-20,
`BlueLab` foi promovida por fast-forward para esse mesmo SHA. As duas branches remotas
passaram a apontar para `2dc5b74`; não houve force-push, reconstrução por cherry-pick
ou acesso à Espelunca.

O plano de execução transacional em worktree e seu relatório foi definido em
`TRANSACTION_PLAN.md`, com worktree temporário, gates de risco, resultado estruturado
e proibição de alterar a árvore ativa. O protótipo
`bin/bluelab-transaction-plan` foi implementado e testado apenas contra repositórios
Git temporários; `bin/bluelab` continua inalterado. O próximo passo seguro é executar
a análise dos caminhos `UNCLASSIFIED` e a revisão semântica dos domínios em conflito.
Não integrar ou implantar qualquer atualização upstream antes de registrar essa
decisão por domínio.

## Regra de encerramento de etapas

Toda etapa funcional deste sistema deve ser publicada em `BlueLab-Test`, aplicada no
mastodon.blue por `blue-atualizar` e verificada antes de ser considerada concluída. O
checkpoint posterior deve registrar o SHA funcional aplicado, serviços, healthcheck,
validações específicas e qualquer aviso ou falha. Um commit posterior que contenha
somente o registro não exige novo deploy; ele documenta o deploy já verificado do SHA
funcional. Essa rotina não promove `BlueLab` e não acessa a Espelunca.

## Comandos para continuar

```bash
cd /home/blue/blue
git status --short --branch
sed -n '1,240p' docs/bluelab-update-system/PROGRESS.md
git diff -- docs/bluelab-update-system bluelab/manifest.yml CODEX_PROGRESS.md
rg -n "blue2|BlueLab" app/javascript/mastodon/features/{blue2,ui,navigation_panel}
sed -n '1,220p' docs/bluelab-update-system/INTEGRATION_POINTS.md
```

## Estado da árvore Git

O checkpoint funcional contém a migração do catálogo, sua validação automatizada e a
proteção de prontidão de deploy. Confirmar o estado real com `git status`, refs
remotas e `git log` antes de agir; não incluir extrações adicionais do shell no mesmo
lote sem nova análise própria.
