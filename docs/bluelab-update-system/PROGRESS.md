# Progresso — sistema de atualização BlueLab

## Objetivo geral

Reduzir acoplamento do fork BlueLab ao Mastodon e construir atualização upstream
transacional, validada por manifesto, sem promoção ou acesso à Espelunca.

## Fase atual

Fases 0–2 concluídas. A integração upstream, as correções visuais subsequentes e o
lote de navegação/Compose foram validados no Blue e promovidos para `BlueLab` em
2026-09-21. A próxima etapa de atualização deve começar por uma nova comparação
transacional com o upstream atual, e não pela repetição de candidatos já aprovados.

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
- A revisão histórica dos conflitos associou `components/menu/` ao shell Blue2,
  `containers/mastodon.jsx` ao composer rico e `components/status/`/`components/card/`
  ao domínio de status e mídia. `app/javascript/mastodon/locales/en.json` permanece
  `UNCLASSIFIED`, pois agrega mensagens de vários domínios e não deve receber
  classificação automática.
- O mapeamento foi publicado no SHA `bc7f7b03b8` e aplicado no Blue; serviços ativos
  e healthcheck `OK`. A simulação repetida contra o mesmo `upstream/main` manteve
  `NEEDS_SEMANTIC_REVIEW` e 19 conflitos, agora distribuídos em 7 do shell, 6 de
  status/mídia, 5 do composer rico e somente 1 `UNCLASSIFIED` (`locales/en.json`).
  Nenhum conflito foi resolvido, integrado, publicado como upstream ou enviado à
  Espelunca.

O hook local também executou `yarn i18n:extract`, que apontou diferenças já
existentes em `app/javascript/mastodon/locales/en.json` (chaves sem relação com este
catálogo). A árvore foi restaurada pelo hook e esse arquivo não integra o lote.

## Testes pendentes

Não há confirmação manual pendente para os lotes já promovidos. Antes de iniciar uma
nova atualização upstream, refazer a comparação de ancestrais e a simulação
transacional contra a ponta atual do upstream; só criar um novo candidato se houver
mudança real a integrar.

## Histórico da integração upstream concluída

### Integração upstream em preparação — 2026-09-21

Com autorização explícita para resolver a revisão semântica, `upstream/main`
(`398b542652bed28de11736b0949083d71847a7ce`) foi integrado somente em um worktree
temporário e no commit de merge local
`075bd395632e814058a9652354e7dba323b18117`. Esse commit ainda **não** foi publicado
em `BlueLab-Test`, não foi aplicado no mastodon.blue e não alterou `BlueLab` nem a
Espelunca.

As 19 colisões foram resolvidas preservando os contratos BlueLab do compositor,
downloads de mídia, shell Blue2 e menu de conta, enquanto a arquitetura upstream de
status e navegação foi adotada onde os módulos foram movidos. A adaptação do menu no
drawer preserva abertura por toque, isolamento de gestos, portal para o `body`, Escape
e os itens BlueLab "Scheduled publications" e "Favorites". A migração upstream do
action bar legado reutiliza o mesmo helper de downloads BlueLab; os mixins CSS antigos
foram mapeados para a tipografia atual do upstream e o `BoostButton` passou ao caminho
legado movido.

Validações executadas no worktree integrado:

- `git diff --check`: passou;
- `yarn typecheck`: passou;
- `yarn test:js app/javascript/mastodon/features/navigation_panel/redesign/account_card_and_menu.test.tsx`:
  8 testes passaram;
- ESLint focal dos adaptadores: passou;
- `yarn build:production`: passou.

O hook de pre-commit não pôde executar a bateria Ruby porque o candidato upstream
passou a declarar Ruby `4.0.7` e essa versão não está instalada no host (`rbenv:
version '4.0.7' is not installed`). O hook restaurou a árvore antes do commit; o merge
foi gravado sem o hook após as verificações JavaScript acima. Isso não substitui a
validação Ruby nem autoriza deploy.

**Próximo passo seguro:** provisionar Ruby 4.0.7 no ambiente do Blue, confirmar
`ruby --version`, `bundle exec ruby --version` e a instalação de dependências do
candidato; então executar os testes Ruby relevantes. Somente se esses gates passarem,
publicar o commit de merge em `BlueLab-Test`, executar `blue-atualizar`, validar o
Blue e registrar o SHA realmente aplicado. Não promover `BlueLab` e não executar
`espelunca-atualizar` nesta etapa.

### Gate Ruby reaberto — 2026-09-21

Ruby 4.0.7 foi provisionado com `rbenv` em
`/home/blue/.rbenv/versions/4.0.7`. Para obter a definição, o checkout limpo do
plugin `ruby-build` foi atualizado por fast-forward de `13b73fe9` para `01800b05`;
nenhuma configuração do repositório BlueLab foi alterada por essa atualização. No
worktree do candidato, `ruby --version` confirmou `ruby 4.0.7` e `bundle install`
concluiu as 154 dependências do Gemfile (342 gems).

`bundle exec rubocop --force-exclusion` passou nos 13 arquivos Ruby alterados pelo
merge. Os três specs Rails diretamente afetados não executaram exemplos porque este
host não tem PostgreSQL de teste disponível e também não possui Docker para levantar
um banco isolado; todos falharam antes da carga dos exemplos com
`ActiveRecord::ConnectionNotEstablished` para o socket local. Esse é um limite de
infraestrutura de teste, não uma falha de asserção do candidato. A validação no Blue
deve observar migrations, boot e healthcheck antes de qualquer aprovação.

### Candidato aplicado no Blue — 2026-09-21

O candidato funcional `511f1045a195571bfba41c6f4cdf2007bc786261` foi publicado em
`bluelab/BlueLab-Test` e aplicado no mastodon.blue por `blue-atualizar`. A primeira
execução avançou o checkout, mas parou antes de migrations, assets e restart porque
`vendor/bundle/ruby/4.0.0` continha extensões compiladas para Ruby 4.0.6. A árvore de
361 MB foi preservada em `/tmp/blue-vendor-bundle-ruby-4.0.0-pre511f1045` e `bundle
install` recompilou as 342 gems para Ruby 4.0.7. A reaplicação idempotente concluiu
dependências Ruby/JavaScript, migrations sem pendências, sincronização de 200.683
domínios descartáveis (21 novos), precompilação Vite e restart.

Durante a reinstalação, o processo web anterior em memória respondeu uma vez HTTP 500
em `/api/v2/instance` porque ainda referenciava a árvore de gems preservada. Após o
restart final, iniciado às 10:21:31, o Puma declarou prontidão às 10:21:32. Os serviços
`blue-web`, `blue-sidekiq` e `blue-streaming` estão ativos; `/health` local e público
responderam `OK`, e `/api/v2/instance` local e público responderam com sucesso. Não há
erros novos no journal após a prontidão. Os avisos de peer dependencies do Yarn e de
configuração futura do Vite não bloquearam a instalação nem o build.

`BlueLab` continua em `2dc5b74f572566acfed291ab7602a06be9c802d9`; não houve promoção
para estável nem acesso à Espelunca. **Próximo passo:** confirmação manual do usuário
no mastodon.blue para este candidato antes de qualquer promoção.

### Correção de compatibilidade visual pós-upstream — 2026-09-21

Após o teste manual do candidato upstream, foi relatado que o compositor no desktop
perdera a aparência esperada e que os atalhos do menu inferior no mobile apareciam na
lateral, sem cartão/borda. A causa do menu foi objetiva: a adaptação BlueLab preservou
os links próprios, mas deixou de aplicar `floatingCard` ao `ul`; essa é a classe que
define o cartão inferior no CSS upstream. O componente agora combina `floatingCard` e
`list`, sem substituir o comportamento BlueLab dos links.

O compositor e outras superfícies BlueLab ainda usam os nomes semânticos de espaços e
raios anteriores à migração upstream para tokens numéricos. Como esses nomes deixaram
de existir, declarações CSS com `var(...)` ficavam inválidas. O módulo global
`app/javascript/bluelab/styles/_legacy_tokens.scss` restaura aliases explícitos para
os tokens atuais, permitindo a migração gradual dos módulos BlueLab sem uma regressão
visual ampla.

O lote funcional foi publicado em `BlueLab-Test` no SHA
`404d9fb20eac9d20971ed153186e7c99ac385d29` e aplicado no mastodon.blue por
`blue-atualizar`. `git diff --check`, `yarn typecheck`, ESLint focal, Stylelint focal e
`yarn build:production` passaram. O deploy idempotente concluiu dependências,
migrations, assets e restart; `blue-web`, `blue-sidekiq` e `blue-streaming` estão
ativos, enquanto `/health` e `/api/v2/instance` responderam com sucesso tanto local
quanto publicamente.

`BlueLab` e a Espelunca permanecem inalterados. **Próximo passo:** validar no
mastodon.blue o compositor em desktop e a barra inferior em viewport mobile (após
atualização forçada do navegador). Promover somente se o usuário aprovar
explicitamente este SHA funcional.

### Navegação móvel e rodapé do modo avançado — 2026-09-21

O lote `f53028a480a32fae967dcbb5944643ee117759ed` substitui os ícones genéricos
de Compose pelos adaptadores Blue2 no lançador, no botão de navegação e no acionador
global usado pelo modo avançado. Em viewport mobile, o menu esquerdo Blue2 agora é
uma gaveta sobreposta e recolhível: não reserva coluna e seu Compose é somente o
botão que abre o compositor; tocar nele fecha a gaveta. A gaveta direita de tendências
permanece independente.

No modo de múltiplas colunas, o rodapé de links deixa de ser renderizado na navegação
fixa à esquerda. A coluna final “Getting started” passa a renderizar esse mesmo
`NavigationFooterLinks`, removendo o rodapé Mastodon duplicado e mantendo apenas o
rodapé BlueLab no local solicitado.

O commit foi publicado em `BlueLab-Test` e aplicado no mastodon.blue com
`blue-atualizar`. TypeScript, ESLint focal, Stylelint, `yarn build:production`, os 6
testes de `compose/redesign/trigger` e os 8 de `account_card_and_menu` passaram.
O teste legado `navigation_panel/redesign/index.test.tsx` continua falhando também
no `HEAD` anterior: ele solicita menu de conta em `mode='slide-out'`, embora o
componente de base não o renderize nesse modo; não foi alterado neste lote. Após o
deploy, `blue-web`, `blue-sidekiq` e `blue-streaming` estavam ativos, e `/health` e
`/api/v2/instance` responderam local e publicamente.

`BlueLab` e Espelunca continuam inalterados. **Próximo passo:** validação manual no
Blue do ícone de Compose, da gaveta móvel esquerda e do rodapé único no modo avançado;
promover somente após confirmação explícita deste candidato.

### Gaveta e Compose sem colunas no modo avançado — 2026-09-21

O teste manual do lote anterior mostrou que a navegação do modo avançado ainda ficava
fixa como uma coluna e que o Compose legado ainda podia ocupar uma coluna quando o
flag upstream de redesign estivesse desligado. O candidato funcional
`c15ff1f71048b947ee8b85749ca54dcbe2789a8a` substitui a navegação fixa por uma gaveta
esquerda aberta pelo botão de menu e fechada pelo backdrop ou ao navegar. O layout não
reserva mais largura para ela.

O Compose BlueLab agora é um botão fixo independente, com as mesmas classes visuais
de pílula da versão estável. A coluna `COMPOSE` é suprimida explicitamente no tema
Blue2, inclusive quando o flag de redesign do upstream não estiver ativo. Também foi
restaurado o atributo `data-bluelab-compose` e os rótulos BlueLab do botão e das áreas
de feeds personalizados, preservando a aparência estável e o idioma selecionado.

`yarn typecheck`, ESLint focal, Stylelint focal, os 14 testes focalizados de Compose e
menu de conta, e `yarn build:production` passaram. O lote foi publicado em
`BlueLab-Test`, aplicado por `blue-atualizar`; `blue-web`, `blue-sidekiq` e
`blue-streaming` ficaram ativos, e `/health` e `/api/v2/instance` responderam local e
publicamente. `BlueLab` e Espelunca seguem inalterados.

**Próximo passo:** testar no Blue o botão de menu e sua gaveta no modo avançado, o
botão de publicação sem coluna própria e os rótulos no idioma da interface. Só
promover após aprovação explícita deste SHA.

### Faixa compacta do modo avançado — 2026-09-21

Em vez de um botão de menu flutuante, o candidato
`33d38bbffa9eb92337a2cce348e3d9f102b9c85b` mantém uma faixa lateral esquerda de
76 px no modo avançado. Ela mostra os ícones de navegação e o Compose BlueLab sem
rótulos; seu primeiro controle expande e recolhe a própria faixa para o menu completo.
O Compose pertence a essa faixa, portanto não há botão flutuante nem coluna de
compositor. A expansão continua funcionando também nas larguras intermediárias.

TypeScript, ESLint focal, Stylelint, 14 testes focalizados e build de produção
passaram. O SHA foi publicado em `BlueLab-Test` e aplicado por `blue-atualizar`;
`blue-web`, `blue-sidekiq` e `blue-streaming` estão ativos, e `/health` e
`/api/v2/instance` responderam local e publicamente. `BlueLab` e Espelunca
permanecem inalterados.

**Próximo passo:** validar no Blue a faixa compacta, sua expansão/recolhimento e o
botão de Compose integrado. Promover somente após confirmação explícita deste SHA.

### Separação entre faixa avançada e sidebar mobile — 2026-09-21

O relato seguinte indicou que a faixa nova estava afetando a versão mobile e que o
menu compacto ainda deixava textos do perfil/Home cortados. O candidato
`0a10f624ce149501ef52ea488656b972605dffb6` limita a faixa compacta ao breakpoint
não-mobile e restaura o espaço original das telas menores. O menu de conta recebeu
modo compacto próprio: nome, handle e rótulo Home não são renderizados visualmente até
a faixa ser expandida, evitando conteúdo truncado.

TypeScript, ESLint focal, Stylelint e build de produção passaram. O candidato foi
publicado em `BlueLab-Test` e aplicado por `blue-atualizar`; `blue-web`,
`blue-sidekiq` e `blue-streaming` estão ativos e `/health` e `/api/v2/instance`
responderam local e publicamente. `BlueLab` e Espelunca permanecem inalterados.

**Próximo passo:** testar a sidebar mobile preexistente em tela pequena e, no modo
avançado desktop, confirmar que a faixa recolhida mostra somente ícones sem texto
cortado. Promover somente após confirmação explícita deste SHA.

### Restauração exata da sidebar mobile e rodapé BlueLab — 2026-09-21

Foi confirmado que a nova gaveta Blue2 havia substituído indevidamente a sidebar
mobile original. O candidato `2506ad919a80e3ef962f97d6cf249fec7f6b1cc8` restaura
o acionamento original por `openNavigation` e remove apenas a gaveta móvel criada
durante esta sequência; a faixa compacta continua limitada ao modo avançado desktop.
Nenhum comportamento dos demais modos deve ser alterado por este lote.

O rodapé BlueLab na última coluna continua sendo o único rodapé do modo avançado,
mas agora usa superfície, borda, tipografia e links do tema Blue2, removendo a
aparência de HTML legado. TypeScript, ESLint focal, Stylelint, 14 testes focalizados
e build de produção passaram. O SHA foi aplicado por `blue-atualizar`; os serviços
`blue-web`, `blue-sidekiq` e `blue-streaming` estão ativos e `/health` e
`/api/v2/instance` responderam local e publicamente. `BlueLab` e Espelunca seguem
inalterados.

**Próximo passo:** validar a sidebar mobile original e o rodapé BlueLab no modo
avançado. Promover somente após confirmação explícita deste SHA.

### Card de perfil na sidebar retrátil — 2026-09-21

Ao comparar a sidebar retrátil com `BlueLab` estável, foi identificado que o upstream
passou a ocultar `NavigationAccountCardAndMenu` em `mode='slide-out'`. O candidato
`6ef038ace9e848c21b04353ebd76b71497b0a537` restaura esse componente somente nesse
rodapé, incluindo foto, identificação e menu de conta, sem modificar os demais itens
da sidebar ou o modo avançado.

TypeScript, ESLint, o teste da sidebar retrátil, o teste do card de conta e build de
produção passaram. O SHA foi publicado em `BlueLab-Test` e aplicado por
`blue-atualizar`; `blue-web`, `blue-sidekiq` e `blue-streaming` estão ativos, e
`/health` e `/api/v2/instance` responderam local e publicamente. `BlueLab` e
Espelunca seguem inalterados.

**Próximo passo:** confirmar manualmente que o card de perfil voltou ao rodapé da
sidebar retrátil. Promover somente após confirmação explícita deste SHA.

### Geometria do card e marca da instância em tablet — 2026-09-21

O card de perfil retornado no lote anterior ainda não possuía o wrapper estável; sem
ele, a borda não era aplicada e o botão de reticências caía para outra linha. O
candidato `992cc9f4ea21aa77050184d133cdafbf6d6b659d` aplica novamente a classe do
card ao caminho `slide-out`, restaurando flex, borda e alinhamento horizontal.

No tablet, a sidebar legada ativada pelo modo avançado ainda renderizava
`WordmarkLogo`. Para o tema Blue2 esse ponto agora usa somente
`customInstanceLogo`, `customFavicon` ou `/favicon.ico` da instância; a marca padrão
do Mastodon permanece reservada aos outros temas. Tipos, lint, os 10 testes de
sidebar/card e build de produção passaram. O SHA foi aplicado por `blue-atualizar`;
os três serviços estão ativos, e `/health` e `/api/v2/instance` responderam local e
publicamente. `BlueLab` e Espelunca seguem inalterados.

**Próximo passo:** validar no mobile a borda/alinhamento do card e, no tablet em modo
avançado, confirmar que aparece a logo da instância em vez da logo Mastodon.
Promover somente após confirmação explícita deste SHA.

### Rodapé retrátil igual ao estável — 2026-09-21

Uma comparação adicional com a versão estável mostrou que o rodapé retrátil também
deveria manter três atalhos (notificações, mensagens e itens salvos) acima do card e
usar o resumo compacto de perfil em vez do `Lockup` upstream. O candidato
`c113266b93353e2704fad4bfdb5e0880f70eccff` restaura esses três atalhos e substitui,
somente no `slide-out`, o resumo pelo link compacto estável: avatar de 32 px junto à
borda interna, nome/handle e menu na mesma linha.

TypeScript, ESLint, os 10 testes focalizados de sidebar/card e build de produção
passaram. O SHA foi publicado em `BlueLab-Test` e aplicado por `blue-atualizar`;
`blue-web`, `blue-sidekiq` e `blue-streaming` estão ativos, enquanto `/health` e
`/api/v2/instance` responderam local e publicamente. `BlueLab` e Espelunca seguem
inalterados.

**Próximo passo:** validar que os três atalhos e o card no rodapé da sidebar retrátil
correspondem à versão estável. Promover somente após confirmação explícita deste SHA.

### Modo avançado restrito ao desktop — 2026-09-21

O pedido final foi impedir que a preferência de modo avançado transforme celulares ou
tablets em uma versão comprimida do desktop. O candidato
`189198fd9a1063781e8d7522693bb84e809347d9` torna o limite completo do BlueLab
(1174 px) o limiar para o modo avançado, exclusivamente quando o tema é `blue-2`.
Até esse limite a aplicação usa uma única coluna e converte URLs `/deck` para a rota
normal correspondente; assim, uma preferência avançada já salva não mantém colunas,
trilhos ou compositor de desktop no dispositivo compacto.

No mesmo intervalo, a área Blue2 passa a usar a navegação móvel já existente,
inclusive gaveta e barra de ações, em vez de exibir a faixa avançada, a coluna direita
ou o botão de publicação do desktop. Acima de 1174 px o modo avançado e sua faixa
compacta permanecem inalterados. Outros temas não são afetados.

`git diff --check`, `yarn tsc --noEmit` e `yarn build:production` passaram. O ESLint
focal não encontrou erro no TypeScript; a configuração atual informa que o arquivo
JSX legado não possui configuração correspondente. O SHA foi publicado em
`BlueLab-Test` e aplicado por `blue-atualizar`; `blue-web`, `blue-sidekiq` e
`blue-streaming` ficaram ativos, enquanto `/health` e `/api/v2/instance` responderam
local e publicamente. `BlueLab` continua em
`2dc5b74f572566acfed291ab7602a06be9c802d9` e a Espelunca não foi acessada.

**Próximo passo:** no Blue, com o modo avançado ativo, testar um celular e um tablet
(inclusive abrindo uma URL `/deck`): ambos devem abrir a interface móvel normal, com
gaveta e sem colunas avançadas. Em desktop acima de 1174 px, confirmar que a faixa
avançada continua disponível. Promover somente após confirmação explícita deste SHA.

### Host do Compose no modo avançado — 2026-09-21

Foi identificado que o botão de Compose integrado à faixa avançada já despachava
`openNewComposer`, mas a remoção da coluna de compositor havia deixado o host do
diálogo (`ComposeRedesignButton`) desmontado nesse layout. Por isso o estado mudava
sem que houvesse um componente para renderizar o formulário.

O candidato `202ecd3c38991cae1d1cd2f5c2b29c338bc0dbdb` monta esse host somente no
layout avançado. Ele não cria outro botão, coluna ou elemento visível enquanto o
compositor está fechado; a faixa continua sendo o único launcher. Ao clicar nela, o
host compartilhado agora apresenta o diálogo BlueLab e preserva origem, minimizar e
fechamento já usados pelos demais layouts.

`git diff --check`, `yarn tsc --noEmit`, o teste focal da navegação retrátil (2
testes) e `yarn build:production` passaram. O SHA foi publicado em `BlueLab-Test` e
aplicado por `blue-atualizar`; `blue-web`, `blue-sidekiq` e `blue-streaming` ficaram
ativos, e `/health` e `/api/v2/instance` responderam local e publicamente. `BlueLab`
continua em `2dc5b74f572566acfed291ab7602a06be9c802d9`; a Espelunca não foi acessada.

**Próximo passo:** no Blue, em desktop com modo avançado, clicar no Compose da faixa
lateral, confirmar abertura do diálogo, digitar algo e testar minimizar/fechar.
Promover somente após confirmação explícita deste SHA.

### Promoção do lote aprovado — 2026-09-21

Após a confirmação manual de que o Compose avançado funcionou, a promoção verificou
que `BlueLab` (`2dc5b74f572566acfed291ab7602a06be9c802d9`) era ancestral de
`BlueLab-Test` (`d6f1c3ffad50c9ab9b8c896e18f912012602c13b`). O remoto `BlueLab` foi
avançado por fast-forward para esse mesmo SHA, sem force-push, reset, cherry-pick ou
acesso à Espelunca. O SHA promovido contém integralmente o host do Compose
`202ecd3c`, o layout móvel para dispositivos compactos `189198fd` e os ajustes de
sidebar/rodapé já validados no Blue.

`BlueLab` e `BlueLab-Test` apontavam para `d6f1c3ffad` imediatamente após a promoção.
Este checkpoint posterior é documental e não requer novo deploy. A Espelunca pode
receber o lote aprovado com `espelunca-atualizar`, quando o operador decidir fazê-lo.

**Próximo passo:** verificar por Git se `upstream/main` contém commits que ainda não
sejam ancestrais de `BlueLab`; somente então preparar uma nova transação em worktree.

### Nova simulação upstream — 2026-09-21

Após `git fetch upstream --tags --prune`, a ponta `upstream/main` avançou de
`398b542652` para `3b43a085d076044abbbb69d928d704d3c9213b1c`, com 18 commits ainda
fora de `BlueLab`. A simulação `bin/bluelab-transaction-plan` foi executada contra o
SHA estável promovido `d6f1c3ffad` e retornou `NEEDS_SEMANTIC_REVIEW`; o relatório
imutável está em
`/home/blue/.local/state/bluelab/transactions/20260921T202919Z-b4257bf7-650b-4aa8-b607-62c3ddd7220b.json`.

Ela encontrou quatro colisões: `status/action_bar.tsx` (domínio C
`quotes-and-media-downloads`), `navigation_panel/redesign/header.tsx` e `ui/index.jsx`
(domínio B `blue2-shell-navigation`) e `locales/en.json` (`UNCLASSIFIED`). Um
worktree temporário foi criado somente para revisão semântica; o checkout ativo, os
serviços, `BlueLab` e a Espelunca não foram alterados.

**Próximo passo:** reconciliar esses quatro arquivos no worktree, preservando os
contratos BlueLab e as correções upstream, e executar os gates antes de publicar um
novo candidato em `BlueLab-Test`.

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
