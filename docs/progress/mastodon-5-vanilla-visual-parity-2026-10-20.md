# BlueLab — paridade visual do Vanilla com Mastodon 5.0
Data: 2026-10-20
Branch: `BlueLab-Test`
Última etapa registrada: `3e29a4737efb2ae413573b176f15c2aea9e0be24`

## Objetivo
Aproximar o tema Vanilla da implementação oficial atual do Mastodon 5.0, mantendo as personalizações e funcionalidades do BlueLab nos temas que dependem delas. Não promover para `BlueLab` sem aprovação explícita.

## Diagnóstico confirmado
- O tema `default` aponta para `styles/application.scss`, portanto é a opção Vanilla.
- O entrypoint global `app/javascript/styles/application.scss` carregava `legacy_tokens` e aplicava seus aliases em `html` para todos os temas.
- Esses aliases de espaçamento e raio são compatibilidade para módulos antigos do BlueLab; aplicá-los globalmente pode alterar a aparência do Vanilla e contrariar os tokens atuais do Mastodon.
- A página oficial do Mastodon publicou em 2026-10-19 uma revisão do redesenho 5.0. O trabalho oficial inclui atualizações contínuas de navegação, posts, compositor, menus e tokens visuais. Referência: https://blog.joinmastodon.org/2026/10/5.0-a-closer-look/

## Etapa 1 — auditoria de tokens e decisão de segurança
- Foi testada no código a hipótese de limitar os aliases legados aos temas `blue-2` e `mastodon-bird-ui-auto` (commit `3e29a4737efb2ae413573b176f15c2aea9e0be24`).
- A inspeção comparativa mostrou que arquivos compartilhados do BlueLab, como `app/javascript/mastodon/components/menu/styles.module.scss`, ainda consomem nomes legados como `--space-2xs` e `--radius-md` fora de seletores específicos de tema.
- Por segurança, a aplicação global foi restaurada no commit `ba0b60a034251be6f60d5992f90f5dd8fcef008e`. Assim não deixamos uma correção incompleta que poderia quebrar menus/layouts no Vanilla.
- Conclusão: a camada legada pode contribuir para a divergência, mas não deve ser isolada antes de migrar ou encapsular os consumidores compartilhados. Não tratar o isolamento como correção concluída.

## Referência do upstream consultada
Branch oficial: `mastodon/mastodon:main`
HEAD observado durante a investigação: `6d91199483995984904171089a3cfa3b25a6050e`
Commits recentes de redesign observados:
- `e1ce504c20f8d3ed7c40aceb16b2f0cd5931f6e1` — reformulação da ação de boost.
- `005d48ff79e3bf7999b357393479c9f032f4eb18` — ajuste do espaçamento do cabeçalho de colunas.
- `ba40995d49d47e74c14d8b725325e445087fca87` — ajuste de hover em botões.
- `f40067d31b07ffc29ad6c8bf4b56d2655635f8de` — espaçamento entre itens de menu.
Esses commits mostram que o redesenho oficial continuou recebendo refinamentos após a base que o BlueLab já tinha. Os commits foram identificados, mas ainda não foram integrados seletivamente.

## Etapa 2 — refinamentos upstream integrados seletivamente
- `dfc8c14ba06c2c9592429ceb4e7d87aa2c0299ab` — atualiza o espaçamento vertical do cabeçalho de colunas conforme `005d48ff79e3bf7999b357393479c9f032f4eb18`.
- `cb1655c23e6c131e47ed8a46a6f5bfee04232daf` — integra espaçamento entre itens e compensação do padding inferior em menus conforme `f40067d31b07ffc29ad6c8bf4b56d2655635f8de`, preservando regras específicas do BlueLab para popovers.
- `9798aaa65a0a667e57748a587c7048b0a504cb30` — integra a cor de hover para botões ghost conforme `ba40995d49d47e74c14d8b725325e445087fca87`.
- Os ajustes foram aplicados por trechos, preservando as regras personalizadas de BlueLab e Bird UI nos arquivos afetados.

## Etapa 3 — sincronização mais ampla com o upstream 5.0 atual (pendente)
- Revisar os diffs de toda a implementação oficial recente do redesenho, não apenas os três refinamentos acima.
- Integrar componentes visuais e interações que ainda diferem, começando pela reformulação do modal de boost (`e1ce504c20f8d3ed7c40aceb16b2f0cd5931f6e1`) após mapear dependências e testes.
- Auditar React, SCSS, navegação, compositor, menus, cards de status, acessibilidade e traduções.
- Preservar as funções próprias do BlueLab e os temas BlueLab/Bird UI.
- Não fazer merge amplo nem substituir arquivos em lote sem revisão dos diffs por área.

## Etapa 4 — auditoria de dependências do modal de boost (em andamento)
- Localizado o componente correto no upstream: `app/javascript/mastodon/features/ui/components/boost_modal.tsx`; o arquivo correspondente no BlueLab usa a implementação anterior com `EmbeddedStatus`, `PrivacyDropdown` e a assinatura `onReblog(status, privacy)`.
- O commit oficial `e1ce504c20f8d3ed7c40aceb16b2f0cd5931f6e1` substitui essa interface por `ModalShell`, `QuotedStatus`, `Menu` e `ComposeVisibilityButtonText`, além de adicionar `boost_modal.module.scss`. Portanto, não é uma troca isolada de CSS nem uma substituição segura de um único arquivo.
- Confirmada a existência no canal de teste dos componentes `components/menu/index.tsx`, `components/modal_shell/redesign.tsx`, `components/status/quote.tsx` e `features/compose/redesign/visibility.tsx`. Ainda é necessário verificar compatibilidade das APIs, a integração em `modal_root.jsx`, os callbacks de boost e os testes antes de aplicar a mudança.
- Não foi alterado o código funcional nesta etapa; a intenção é evitar quebrar o fluxo de boost/quote ao importar apenas parte do redesign oficial.

## Validação pendente
- Executar testes de Sass/build e lint.
- Verificar visualmente Vanilla em desktop e mobile, nos esquemas claro/escuro.
- Revalidar os temas BlueLab e Bird UI após o isolamento dos tokens.
- Comparar diretamente com mastodon.social e registrar discrepâncias restantes.
- Nenhum teste automatizado, build de assets ou teste visual foi executado por este checkpoint.
- A correção inicial de tokens foi revertida por risco de regressão; a sincronização real com upstream continua pendente.

## Estado
Três refinamentos visuais do upstream foram integrados seletivamente no canal de teste. A camada global de tokens legados foi mantida por segurança, porque componentes compartilhados ainda dependem dela. A paridade integral com o upstream não está comprovada. Não promover para estável até a sincronização, revisão e testes.

## Etapa 5 — feedback de teste: tokens de tema, cores e arredondamentos
- Feedback do usuário após teste manual: o Vanilla ainda não reproduz os arredondamentos do Mastodon 5.0 e não respeita corretamente o novo sistema de cores/temas.
- Causa estrutural confirmada: `app/javascript/styles/application.scss` aplica `@include legacy_tokens.apply` globalmente em `html`; o mixin em `app/javascript/bluelab/styles/_legacy_tokens.scss` mapeia aliases antigos de espaçamento e raio para tokens numéricos atuais. Esses aliases podem afetar componentes compartilhados, então não devem ser removidos nem limitados por tema sem auditar todos os consumidores.
- O sistema de tokens oficial está organizado em `app/javascript/styles/mastodon/tokens/index.scss`, que aplica tokens base e seleciona paletas por `data-color-scheme` e `data-theme-color`. A próxima etapa deve comparar os tokens atuais do upstream com o BlueLab e rastrear overrides de cores/raios em estilos globais e de temas antes de editar.
- Nenhuma alteração funcional feita nesta etapa; os três refinamentos visuais anteriores não resolvem o problema de paridade global. Ainda faltam auditoria de tokens, correção, build/testes e validação visual no navegador.
