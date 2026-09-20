# Progresso — sistema de atualização BlueLab

## Objetivo geral

Reduzir acoplamento do fork BlueLab ao Mastodon e construir atualização upstream
transacional, validada por manifesto, sem promoção ou acesso à Espelunca.

## Fase atual

Fases 0–2 concluídas e documentadas. A primeira fronteira B de baixo risco foi
migrada e validada sem alterar o comportamento dos consumidores.

## Último checkpoint concluído

Proteção inicial verificada em 2026-09-20: branch `bluelab-teste`, HEAD
`8300c26ed840eec984932a55a2a027392b98e96c`, árvore limpa; branch local de recuperação
`backup/bluelab-before-update-system-20260920` criada no mesmo SHA. O upstream foi
buscado sem alterar a árvore de trabalho. O complemento do inventário foi consolidado
em `31ae6ac1b8`; sua validação confirmou 21 domínios e os nove caminhos de teste
declarados nas cinco novas entradas.

## Último commit criado

`31ae6ac1b8 bluelab-update: complete customization inventory scope`.

## Arquivos já migrados

- `app/javascript/mastodon/features/blue2/locale.ts` foi movido sem alterações de
  conteúdo para `app/javascript/bluelab/i18n/blue2.ts`.
- Os seis consumidores passaram a importar o contrato BlueLab: navegação e right
  rail Blue2, columns area, cabeçalho e painel de navegação, e direct timeline.
- `app/javascript/bluelab/i18n/blue2.test.ts` cobre normalização de locale regional
  e fallback para inglês.

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

O hook local também executou `yarn i18n:extract`, que apontou diferenças já
existentes em `app/javascript/mastodon/locales/en.json` (chaves sem relação com este
catálogo). A árvore foi restaurada pelo hook e esse arquivo não integra o lote.

## Testes pendentes

Permanece pendente uma validação visual/manual do shell Blue2 no canal de testes.
Ela deve confirmar rótulos em um locale regional e em um locale sem tradução,
navegação, right rail, painel e direct timeline.

## Próximo passo exato

No Blue, executar `blue-atualizar` e validar manualmente o shell Blue2. Enquanto o
lote estiver em teste, `BlueLab` deve permanecer inalterada. Após aprovação explícita
do usuário, promover o mesmo commit por fast-forward para `BlueLab`.

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

O checkpoint funcional deve conter somente a migração do catálogo e seus testes.
Confirmar o estado real com `git status` antes de agir e não incluir extrações
adicionais do shell no mesmo lote.
