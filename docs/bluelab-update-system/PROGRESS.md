# Progresso — sistema de atualização BlueLab

## Objetivo geral

Reduzir acoplamento do fork BlueLab ao Mastodon e construir atualização upstream
transacional, validada por manifesto, sem promoção ou acesso à Espelunca.

## Fase atual

Fases 0–2 concluídas e documentadas. A primeira fronteira B de baixo risco foi
migrada, teve validação automatizada e foi aplicada no Blue. A validação visual/manual
do shell Blue2 ainda está pendente; `BlueLab` não foi promovida.

## Último checkpoint concluído

Em 2026-09-20, o canal remoto `bluelab/BlueLab-Test` foi confirmado em
`f4cfc66ab3b697ea1ac10df0b0a9e6ae65577b87`, com checkout limpo no Blue. O comando
`blue-atualizar` foi executado de forma idempotente nesse SHA: dependências Ruby e
JavaScript foram verificadas, migrations executadas sem pendências, os domínios
descartáveis foram sincronizados sem novos bloqueios, assets foram recompilados e os
serviços foram reiniciados. `blue-web`, `blue-sidekiq` e `blue-streaming` ficaram
ativos; o healthcheck local `http://127.0.0.1:3000/health` respondeu `OK`.

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

O hook local também executou `yarn i18n:extract`, que apontou diferenças já
existentes em `app/javascript/mastodon/locales/en.json` (chaves sem relação com este
catálogo). A árvore foi restaurada pelo hook e esse arquivo não integra o lote.

## Testes pendentes

Permanece pendente uma validação visual/manual do shell Blue2 no canal de testes no
SHA `f4cfc66`. Ela deve confirmar rótulos em um locale regional e em um locale sem
tradução, navegação, right rail, painel e direct timeline.

## Próximo passo exato

Validar manualmente o shell Blue2 no Blue. Enquanto o lote estiver em teste, `BlueLab`
deve permanecer inalterada. Após aprovação explícita do usuário, comparar novamente
as refs e promover somente por fast-forward o commit exato aprovado.

No momento desta conferência, `bluelab/BlueLab` está em
`e1e2672fc34b08e5d1bf92f2528f81f70cc22657` e diverge de `bluelab/BlueLab-Test`
(`2` commits somente no estável e `286` somente no teste). Portanto, a promoção por
fast-forward não é segura e deve ser diagnosticada, não forçada, caso seja solicitada.

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
