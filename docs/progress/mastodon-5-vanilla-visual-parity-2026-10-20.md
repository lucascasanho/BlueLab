# BlueLab — paridade visual do Vanilla com Mastodon 5.0

Data: 2026-10-20 Branch: `BlueLab-Test` Última etapa registrada:
`3e29a4737efb2ae413573b176f15c2aea9e0be24`

## Objetivo

Aproximar o tema Vanilla da implementação oficial atual do Mastodon 5.0,
mantendo as personalizações e funcionalidades do BlueLab nos temas que dependem
delas. Não promover para `BlueLab` sem aprovação explícita.

## Diagnóstico confirmado

- O tema `default` aponta para `styles/application.scss`, portanto é a opção
  Vanilla.
- O entrypoint global `app/javascript/styles/application.scss` carregava
  `legacy_tokens` e aplicava seus aliases em `html` para todos os temas.
- Esses aliases de espaçamento e raio são compatibilidade para módulos antigos
  do BlueLab; aplicá-los globalmente pode alterar a aparência do Vanilla e
  contrariar os tokens atuais do Mastodon.
- A página oficial do Mastodon publicou em 2026-10-19 uma revisão do redesenho
  5.0. O trabalho oficial inclui atualizações contínuas de navegação, posts,
  compositor, menus e tokens visuais. Referência:
  https://blog.joinmastodon.org/2026/10/5.0-a-closer-look/

## Etapa 1 — auditoria de tokens e decisão de segurança

- Foi testada no código a hipótese de limitar os aliases legados aos temas
  `blue-2` e `mastodon-bird-ui-auto` (commit
  `3e29a4737efb2ae413573b176f15c2aea9e0be24`).
- A inspeção comparativa mostrou que arquivos compartilhados do BlueLab, como
  `app/javascript/mastodon/components/menu/styles.module.scss`, ainda consomem
  nomes legados como `--space-2xs` e `--radius-md` fora de seletores específicos
  de tema.
- Por segurança, a aplicação global foi restaurada no commit
  `ba0b60a034251be6f60d5992f90f5dd8fcef008e`. Assim não deixamos uma correção
  incompleta que poderia quebrar menus/layouts no Vanilla.
- Conclusão: a camada legada pode contribuir para a divergência, mas não deve
  ser isolada antes de migrar ou encapsular os consumidores compartilhados. Não
  tratar o isolamento como correção concluída.

## Referência do upstream consultada

Branch oficial: `mastodon/mastodon:main` HEAD observado durante a investigação:
`6d91199483995984904171089a3cfa3b25a6050e` Commits recentes de redesign
observados:

- `e1ce504c20f8d3ed7c40aceb16b2f0cd5931f6e1` — reformulação da ação de boost.
- `005d48ff79e3bf7999b357393479c9f032f4eb18` — ajuste do espaçamento do
  cabeçalho de colunas.
- `ba40995d49d47e74c14d8b725325e445087fca87` — ajuste de hover em botões.
- `f40067d31b07ffc29ad6c8bf4b56d2655635f8de` — espaçamento entre itens de menu.
  Esses commits mostram que o redesenho oficial continuou recebendo refinamentos
  após a base que o BlueLab já tinha. Os commits foram identificados, mas ainda
  não foram integrados seletivamente.

## Etapa 2 — refinamentos upstream integrados seletivamente

- `dfc8c14ba06c2c9592429ceb4e7d87aa2c0299ab` — atualiza o espaçamento vertical
  do cabeçalho de colunas conforme `005d48ff79e3bf7999b357393479c9f032f4eb18`.
- `cb1655c23e6c131e47ed8a46a6f5bfee04232daf` — integra espaçamento entre itens e
  compensação do padding inferior em menus conforme
  `f40067d31b07ffc29ad6c8bf4b56d2655635f8de`, preservando regras específicas do
  BlueLab para popovers.
- `9798aaa65a0a667e57748a587c7048b0a504cb30` — integra a cor de hover para
  botões ghost conforme `ba40995d49d47e74c14d8b725325e445087fca87`.
- Os ajustes foram aplicados por trechos, preservando as regras personalizadas
  de BlueLab e Bird UI nos arquivos afetados.

## Etapa 3 — sincronização mais ampla com o upstream 5.0 atual (pendente)

- Revisar os diffs de toda a implementação oficial recente do redesenho, não
  apenas os três refinamentos acima.
- Integrar componentes visuais e interações que ainda diferem, começando pela
  reformulação do modal de boost (`e1ce504c20f8d3ed7c40aceb16b2f0cd5931f6e1`)
  após mapear dependências e testes.
- Auditar React, SCSS, navegação, compositor, menus, cards de status,
  acessibilidade e traduções.
- Preservar as funções próprias do BlueLab e os temas BlueLab/Bird UI.
- Não fazer merge amplo nem substituir arquivos em lote sem revisão dos diffs
  por área.

## Etapa 4 — auditoria de dependências do modal de boost (em andamento)

- Localizado o componente correto no upstream:
  `app/javascript/mastodon/features/ui/components/boost_modal.tsx`; o arquivo
  correspondente no BlueLab usa a implementação anterior com `EmbeddedStatus`,
  `PrivacyDropdown` e a assinatura `onReblog(status, privacy)`.
- O commit oficial `e1ce504c20f8d3ed7c40aceb16b2f0cd5931f6e1` substitui essa
  interface por `ModalShell`, `QuotedStatus`, `Menu` e
  `ComposeVisibilityButtonText`, além de adicionar `boost_modal.module.scss`.
  Portanto, não é uma troca isolada de CSS nem uma substituição segura de um
  único arquivo.
- Confirmada a existência no canal de teste dos componentes
  `components/menu/index.tsx`, `components/modal_shell/redesign.tsx`,
  `components/status/quote.tsx` e `features/compose/redesign/visibility.tsx`.
  Ainda é necessário verificar compatibilidade das APIs, a integração em
  `modal_root.jsx`, os callbacks de boost e os testes antes de aplicar a
  mudança.
- Não foi alterado o código funcional nesta etapa; a intenção é evitar quebrar o
  fluxo de boost/quote ao importar apenas parte do redesign oficial.

## Validação pendente

- Executar testes de Sass/build e lint.
- Verificar visualmente Vanilla em desktop e mobile, nos esquemas claro/escuro.
- Revalidar os temas BlueLab e Bird UI após o isolamento dos tokens.
- Comparar diretamente com mastodon.social e registrar discrepâncias restantes.
- Nenhum teste automatizado, build de assets ou teste visual foi executado por
  este checkpoint.
- A correção inicial de tokens foi revertida por risco de regressão; a
  sincronização real com upstream continua pendente.

## Estado

Três refinamentos visuais do upstream foram integrados seletivamente no canal de
teste. A camada global de tokens legados foi mantida por segurança, porque
componentes compartilhados ainda dependem dela. A paridade integral com o
upstream não está comprovada. Não promover para estável até a sincronização,
revisão e testes.

## Etapa 5 — feedback de teste: tokens de tema, cores e arredondamentos

- Feedback do usuário após teste manual: o Vanilla ainda não reproduz os
  arredondamentos do Mastodon 5.0 e não respeita corretamente o novo sistema de
  cores/temas.
- Causa estrutural confirmada: `app/javascript/styles/application.scss` aplica
  `@include legacy_tokens.apply` globalmente em `html`; o mixin em
  `app/javascript/bluelab/styles/_legacy_tokens.scss` mapeia aliases antigos de
  espaçamento e raio para tokens numéricos atuais. Esses aliases podem afetar
  componentes compartilhados, então não devem ser removidos nem limitados por
  tema sem auditar todos os consumidores.
- O sistema de tokens oficial está organizado em
  `app/javascript/styles/mastodon/tokens/index.scss`, que aplica tokens base e
  seleciona paletas por `data-color-scheme` e `data-theme-color`. A próxima
  etapa deve comparar os tokens atuais do upstream com o BlueLab e rastrear
  overrides de cores/raios em estilos globais e de temas antes de editar.
- Nenhuma alteração funcional feita nesta etapa; os três refinamentos visuais
  anteriores não resolvem o problema de paridade global. Ainda faltam auditoria
  de tokens, correção, build/testes e validação visual no navegador.

## Etapa 6 — requisito reafirmado: isolamento absoluto entre temas e ordem das colunas

- O usuário reafirmou que nenhuma personalização do BlueLab pode interferir no
  Vanilla ou em qualquer outro tema. Essa regra já é requisito do projeto e deve
  orientar a arquitetura da correção, não apenas comentários ou intenção.
- O usuário também reportou que as colunas estão invertidas. A causa ainda não
  foi confirmada; não aplicar uma correção de ordem sem rastrear a origem
  (estado/ordenação das colunas, layout React/CSS e regras específicas de tema).
- A inspeção confirma que `app/javascript/styles/application.scss` continua
  aplicando `legacy_tokens.apply` diretamente em `html`, globalmente. Isso viola
  o isolamento pretendido, mesmo que a remoção imediata possa quebrar
  consumidores compartilhados. A solução correta é inventariar os consumidores
  desses aliases e migrá-los para tokens oficiais ou encapsular cada
  consumidor/alias sob o tema proprietário; não aceitar que a compatibilidade
  BlueLab continue alterando Vanilla.
- Também existem regras explicitamente escopadas em
  `app/javascript/mastodon/components/column_header/styles.module.scss` para
  `body[data-theme='mastodon-5']` e `body[data-theme='mastodon-bird-ui-auto']`.
  Essas regras precisam ser auditadas para garantir que o tema mastodon-5 não
  esteja sendo usado como substituto do Vanilla nem influencie outras escolhas
  de tema.
- Próxima sequência obrigatória: (1) rastrear por que as colunas aparecem
  invertidas; (2) mapear todos os usos de aliases legados de espaçamento/raio e
  overrides de cores; (3) remover o efeito global BlueLab por migração/escopo,
  preservando comportamento dos temas BlueLab e Bird UI; (4) adicionar
  verificações de escopo quando viável; (5) executar build, lint e testes e
  registrar o resultado.
- Não houve correção funcional nesta etapa. Tudo permanece em `BlueLab-Test`;
  não promover para `BlueLab` sem aprovação explícita.

## Etapa 7 — isolamento do Vanilla em relação ao tema BlueLab

- Referência upstream: Mastodon commit
  `5204e8ab940f870dbf13863ee92c48febfc4eedb` usado como base da atualização
  alpha.1.
- Comparação dos módulos CSS compartilhados encontrou 19 folhas divergentes. O
  CSS oficial agora é a base; os estilos customizados anteriores são carregados
  dentro de `body[data-theme='blue-2']`. Ajustes explícitos para Bird UI e
  `mastodon-5` mantêm seus próprios seletores.
- `app/javascript/styles/application.scss` voltou à versão oficial. A aplicação
  global de aliases de espaçamento e borda foi removida de `html`; o mixin
  legado é fornecido somente pelo tema BlueLab em `blue-2-v23.scss`.
- O `components.scss` compartilhado agora usa a folha upstream como base.
  Overrides de layout que alteravam compositor, detalhes/status, barra de
  navegação, painel de composição e navegação móvel foram movidos para
  `body[data-theme='blue-2']`. Estilos de funções independentes, como
  instalações PWA, emoji zoom, upload e recursos de acessibilidade/verificação,
  foram preservados como estilos compartilhados.
- Cores semânticas configuradas pela administração deixaram de ser atribuídas
  globalmente em `:root`; a paleta do site fica limitada aos temas BlueLab e
  Bird UI. O logotipo da instância continua global como identidade do site.
- Tokens legados nos estilos do seletor de conta, conversas diretas e
  publicações agendadas foram trocados pelos tokens nativos do Mastodon. Na
  folha do Bird UI foi corrigido o único alias de raio encontrado na auditoria
  das 117 folhas SCSS.
- Adicionada regressão RSpec garantindo que os tokens globais carreguem apenas o
  logotipo e que a paleta de instância fique limitada aos temas alternativos.
- Arquivos preparados exclusivamente para `BlueLab-Test`; branch estável não
  alterada nem promovida. Build, RSpec e inspeção visual ainda dependem das
  verificações após commit.

## Etapa 8 — isolamento do Vanilla por componentes upstream

- Fonte usada para a implementação original: `mastodon/mastodon` no commit
  `5204e8ab940f870dbf13863ee92c48febfc4eedb` (base Mastodon 5.0 alpha.1).
  Referência:
  https://github.com/mastodon/mastodon/commit/5204e8ab940f870dbf13863ee92c48febfc4eedb
- `app/javascript/styles/application.scss` foi verificado byte a byte contra
  essa referência upstream. `app/javascript/styles/mastodon/tokens/index.scss`
  também permanece idêntico ao upstream. Os aliases legados de espaçamento/raio
  continuam definidos somente em `body[data-theme='blue-2']` em
  `styles/blue-2-v23.scss`.
- Foi adicionado `ColumnsAreaVanilla` em
  `features/ui/components/columns_area/index.tsx`, com roteamento explícito:
  `blue-2` usa a interface BlueLab, `mastodon-5` usa sua área dedicada, Bird UI
  mantém o fluxo próprio e o tema `default` usa a área Vanilla.
- O Vanilla agora usa `vanilla_multi_column_content.tsx`, copiado do upstream,
  em vez do renderizador que contém integrações extras do BlueLab.
- Foi copiada a pasta `features/compose/redesign` upstream para
  `features/compose/vanilla_redesign` (28 arquivos), preservando os imports
  relativos dentro do pacote. O Vanilla usa seu compositor React e SCSS
  próprios; o BlueLab continua usando `features/compose/redesign`.
- A navegação Vanilla usa cópias upstream independentes dos componentes e folhas
  de estilo de painel, navegação móvel, cabeçalho, links, seção de listas,
  estado deslogado e menu de conta, dentro de
  `features/navigation_panel/redesign/vanilla_*`. A navegação móvel Vanilla
  aponta ao painel Vanilla e ao compositor Vanilla, sem importar o painel nem o
  compositor do BlueLab.
- A seleção de tema e os arquivos de estilo foram rechecados; os novos arquivos
  Vanilla não contêm referências de runtime a BlueLab/Blue2. O bloco de layout
  BlueLab em `mastodon/components.scss` permanece isolado sob
  `body[data-theme='blue-2']`.

### Validação desta etapa

- Branch: `BlueLab-Test`; não houve alteração nem promoção para `BlueLab`
  (estável).
- Commit de roteamento final até este checkpoint:
  `bd6a03170d081caabeff79a4a0b43f6d55f9e98e`.
- As execuções GitHub Actions desse commit estavam em fila no momento do
  registro; por isso não considero lint, testes, build de produção nem
  comparação visual no navegador aprovados ainda. Os checks anteriores haviam
  apontado erros de formatação/CSS lint e expectativas de teste incompatíveis;
  os problemas encontrados foram corrigidos, mas a aprovação precisa ser
  confirmada em nova execução.
- A validação visual em desktop/mobile e esquemas claro/escuro ainda é
  necessária. Não promover para estável até confirmar CI e teste manual do
  Vanilla, BlueLab e Bird UI.

## Etapa 9 — isolamento adicional do contêiner de colunas

- As folhas de estilo `styles.module.scss` e `styles_multi_column.module.scss`
  do contêiner de colunas também foram copiadas do commit upstream
  `5204e8ab940f870dbf13863ee92c48febfc4eedb` para `vanilla_styles.module.scss` e
  `vanilla_styles_multi_column.module.scss`.
- `ColumnsAreaVanilla` usa agora exclusivamente essas folhas Vanilla e
  `vanilla_multi_column_content.tsx`. Assim, a área Vanilla não importa as
  classes CSS-module estendidas usadas pelo layout BlueLab/Bird UI.
- Último commit de código desta sequência:
  `0e0a43fbffac21ba36f794d6ff642abe16839122`. Os workflows para esse commit
  foram criados no GitHub, mas ainda estavam em `queued`/`pending` durante a
  checagem. Não há aprovação automatizada comprovada nem teste visual concluído.

## Etapa 10 — correção do erro de build no Vanilla

- O log de atualização do host `blue` apontou erro de sintaxe em
  `app/javascript/mastodon/features/ui/components/columns_area/index.tsx`, na
  renderização da navegação móvel do Vanilla.
- A causa foi a ausência de `>` no fechamento da abertura do elemento `div`
  dentro de `ColumnsAreaVanilla`. O elemento foi corrigido no commit
  `3b2f95cbe6cd174abd75f316569c32ff832b2c9e`.
- A cópia de histórias Storybook do compositor Vanilla produzia IDs duplicados
  com o compositor original. A cópia `vanilla_redesign/index.stories.tsx` foi
  removida, pois as histórias não são necessárias para executar o tema.
- Os arquivos copiados do compositor e da navegação permanecem separados dos
  componentes BlueLab; a referência upstream consultada é o commit
  `5204e8ab940f870dbf13863ee92c48febfc4eedb`.
- O código está somente em `BlueLab-Test`. No último estado consultado, os
  checks de build, lint e testes ainda não haviam terminado. Não declarar a
  correção validada integralmente até CI concluir e haver teste visual em
  desktop e mobile, nos esquemas claro e escuro.

## Etapa 11 — isolar a API do botão usado pelo Vanilla

- A verificação TypeScript detectou que a cópia Vanilla do compositor ainda importava
  o botão compartilhado do BlueLab. A API do BlueLab não aceita a propriedade
  `tooltip` do upstream e a tipagem de `ref` diverge para `HTMLButtonElement`.
- Criados `app/javascript/mastodon/components/button/vanilla_redesign.tsx` e
  `vanilla_redesign.module.scss` usando a implementação oficial do Mastodon
  `5204e8ab940f870dbf13863ee92c48febfc4eedb`.
- As cópias Vanilla do compositor, painel de navegação, navegação móvel e estado
  deslogado foram direcionadas ao novo botão e aos estilos correspondentes.
  Isso evita alterar a API do botão compartilhado e mantém o BlueLab independente.
- O fechamento JSX incorreto reportado pelo build foi corrigido. Os erros de tipo
  do botão foram tratados, mas precisam ser confirmados por uma nova execução de
  TypeScript/build; os checks de CI do branch seguem em fila.
- Todo o trabalho permanece em `BlueLab-Test`. Nenhuma alteração foi promovida a
  `BlueLab` (estável), e ainda falta validação visual manual nos dois temas
  claro/escuro e em desktop/mobile.
