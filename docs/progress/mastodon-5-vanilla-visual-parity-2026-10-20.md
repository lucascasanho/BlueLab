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

## Etapa 1 — correção de isolamento de tokens
Commit: `3e29a4737efb2ae413573b176f15c2aea9e0be24`
Arquivo: `app/javascript/styles/application.scss`
- Removida a aplicação global dos aliases legados em `html`.
- Os aliases agora ficam limitados a `body[data-theme='blue-2']` e `body[data-theme='mastodon-bird-ui-auto']`, os temas customizados que podem depender da camada de compatibilidade.
- Vanilla (`default`) deixa de receber esses aliases globais e usa os tokens originais do Mastodon.

## Etapa 2 — sincronização com o upstream 5.0 atual (pendente)
- Comparar o código da branch de teste com o upstream oficial atual, incluindo os commits recentes do redesenho.
- Identificar e integrar os arquivos upstream que ainda não chegaram ao BlueLab, sem sobrescrever personalizações próprias.
- Auditar conflitos em React, SCSS, navegação, compositor, menus, cards de status, acessibilidade e traduções.
- Preservar as funções próprias do BlueLab e os temas BlueLab/Bird UI.
- Não fazer merge amplo nem substituir arquivos em lote sem revisão dos diffs por área.

## Validação pendente
- Executar testes de Sass/build e lint.
- Verificar visualmente Vanilla em desktop e mobile, nos esquemas claro/escuro.
- Revalidar os temas BlueLab e Bird UI após o isolamento dos tokens.
- Comparar diretamente com mastodon.social e registrar discrepâncias restantes.
- Nenhum teste automatizado, build de assets ou teste visual foi executado por este checkpoint.

## Estado
Correção inicial de escopo de tokens registrada no canal de teste. A paridade integral com o upstream ainda não está comprovada. Não promover para estável até a sincronização, revisão e testes.
