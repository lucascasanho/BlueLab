# Mastodon 5.0.0-alpha.1 — checkpoint de integração BlueLab

Atualizado em: 2026-10-20 (UTC)  
Repositório: [lucascasanho/BlueLab](https://github.com/lucascasanho/BlueLab)  
Canal de trabalho: `BlueLab-Test`  
SHA auditado no início desta retomada: `70c69b0a3b0eff0ab9df6ea36c9b0f8974947cea`  
Estado: **em correção e validação; não considerar pronto para aprovação**.

## Escopo e proteções

- Integrar o código do Mastodon `5.0.0-alpha.1` ao canal de teste, preservando recursos e personalizações BlueLab existentes.
- Trabalhar apenas em `BlueLab-Test` para código funcional e documentação desta integração.
- Não promover para `BlueLab`, não implantar produção e não acessar/atualizar a Espelunca sem autorização explícita.
- O PR [#201](https://github.com/lucascasanho/BlueLab/pull/201) é exclusivamente de validação de CI, não deve ser mesclado.
- Não considerar a atualização validada apenas porque o build de produção compila. Requer lint, testes Ruby/JS, migrações, smoke test e verificação manual no ambiente de teste.
- Atualizar este checkpoint depois de cada etapa/commit: motivo, arquivos/áreas tocados, verificações, SHA e próximo passo.

## Situação encontrada em 2026-10-20

A integração do alpha já está presente em `BlueLab-Test`; houve alterações de compatibilidade, lint, schema e CSS/TS nas últimas dezenas de commits. Esta retomada não recria o merge nem aplica um novo merge cegamente: corrige os bloqueios que a CI identificou.

### CI do SHA auditado

- **Passou:** build de produção; JavaScript Testing; Ruby Linting; CSS Linting; Haml Linting; Bundler Audit; Historical data migration test; Test container image build.
- **Falhou no SHA inicial:** JavaScript Linting, formatação, Ruby/RSpec e E2E. As correções subsequentes estão sendo verificadas por novos workflows; consultar o histórico abaixo e não tratar a integração como validada enquanto os jobs atuais não passarem.
- Os E2E em Ruby 4.0 também mostraram erro de servidor: `ThemeHelper#available_theme_colors` chama `Themes.instance.available_theme_colors`, método que não existe na classe atual `Themes`. Esse erro provoca HTTP 500 em páginas e faz falhar vários testes de navegador.
- Também há evidência de discrepância entre migrações e `db/schema.rb`: o modelo/testes de selo de verificação usam `verified_badge_visible`, coluna ausente do schema exportado, apesar de existir a migração `db/migrate/20260926151300_add_verified_badge_visible_to_accounts.rb`.
- O commit `8b2c6e8281065a0bd968d9134920bc36ff78b3da` já tentou incluir tabelas BlueLab no schema, mas a execução atual demonstra que é necessário conferir a cobertura de colunas/tabelas customizadas, não apenas o nome do commit.
- O PR #201 usa `qa/mastodon-5-alpha-validation-20261019` como base e `BlueLab-Test` como head, foi criado exclusivamente para disparar CI e **não deve ser mesclado**.

## Etapas

### Etapa 1 — auditoria e checkpoint

- [x] Confirmar branch de teste, SHA e branch estável separada.
- [x] Confirmar PR de QA, sua finalidade e instrução de não mesclar.
- [x] Registrar falhas observadas pela CI e localizar a primeira regressão de renderização.
- [x] Criar este arquivo para continuidade entre sessões.

### Etapa 2 — compatibilidade de temas / erros HTTP 500

- [x] Inspecionar os usos de `available_theme_colors` e a configuração atual de temas do Mastodon 5.
- [x] Corrigir a chamada obsoleta preservando a intenção visual BlueLab, usando o contrato atual do upstream.
- [x] Adicionar teste focado para a paleta configurada do tema BlueLab.
- [ ] Aguardar os testes focados de helper/layout, build do Vite e CI do novo SHA; confirmar também que a preferência de cor não ficou vazia.

### Etapa 3 — schema e migrações BlueLab

- [x] Comparar migrações customizadas, modelos, schema exportado e testes.
- [x] Corrigir no schema as colunas ausentes confirmadas: `accounts.verified_badge_visible` e `account_conversations.last_read_status_id`.
- [x] Confirmar pela migração `20260925094651_create_fasp_capabilities.rb` que `fasp_providers.capabilities` é removida intencionalmente e que a fonte de verdade final é `fasp_capabilities`; não manter a coluna removida no schema.
- [ ] Rodar o teste de migrações e testes focados do recurso de verificação após a correção final do schema.
- [x] Registrar o commit de schema; resultados do commit final ainda pendentes.

### Etapa 4 — lint e formatação

- [x] Corrigir manualmente os dois blocos de função com formatação divergente em `bug_report_modal.tsx`, sem alterar o comportamento.
- [ ] Confirmar a formatação com o job oficial `Check formatting` no SHA mais recente (o job passou no SHA `9d73006`; a verificação do SHA mais recente está em execução).
- [ ] Resolver erros ESLint/TypeScript concretos no código atual; não suprimir regras globalmente para mascarar problemas.
- [ ] Rodar os comandos focados e o conjunto de lint JS.
- [ ] Registrar quantidade de erros antes/depois e quaisquer bloqueios remanescentes.

### Etapa 5 — matriz Ruby, testes completos e validação do canal

- [ ] Confirmar a versão Ruby exigida por `.ruby-version`, `Gemfile` e workflow upstream do alpha.
- [ ] Distinguir incompatibilidade da matriz CI de falhas reais; alterar workflow somente após confirmar as versões oficialmente visadas.
- [ ] Reexecutar CI, testes de migração, RSpec/E2E, build e lint; não marcar como pronto enquanto houver falhas relevantes sem explicação.
- [ ] Verificar diff total para garantir que nenhum recurso BlueLab foi removido acidentalmente pelo merge upstream.
- [ ] Aplicar a atualização apenas no mastodon.blue pelo fluxo normal do ambiente de teste quando o commit estiver coerente, e confirmar health/serviços e fluxos principais. Estado do deploy não foi presumido nesta auditoria.
- [ ] Solicitar ao usuário os testes manuais de interface necessários antes de considerar a etapa concluída.

## Histórico de alterações desta atualização

<!-- prettier-ignore -->
| Data (UTC) | Etapa | Alteração | Validação | SHA |
|---|---|---|---|---|
| 2026-10-20 | 1 | Criado checkpoint com estado inicial, escopo, CI e plano de correção. | Estado inicial auditado; CI do SHA `70c69b0a3b0eff0ab9df6ea36c9b0f8974947cea` consultada. | `0a9c63a1c6392e04cfa512890d7d59cfc1db9efb` |
| 2026-10-20 | 2 | Restaurado o contrato `Themes#available_theme_colors`, atualizado `config/themes.yml` para o formato `path`/`colors` aceito pelo Mastodon atual, e adicionado teste para a paleta BlueLab. | Correção publicada no canal de teste. Testes e CI do novo SHA ainda pendentes; não declarar a etapa validada antes dos resultados. | `b573c59cf1c994d5cbc73febd10115afa54193df` |
| 2026-10-20 | 3 | Corrigido `db/schema.rb` para incluir as colunas existentes nas migrações e que faltavam no schema: `last_read_status_id`, `verified_badge_visible` e `fasp_providers.capabilities`. | Diff aplicado no canal de teste; execução de migrações, RSpec e CI do novo SHA ainda pendentes. | `dbd20c5ff56eb4b641cde8e2de643c99d27790c9` |
| 2026-10-20 | 4 | Corrigida a formatação dos dois blocos de callback em `bug_report_modal.tsx`, único arquivo indicado pelo `yarn format:check`. | Alteração publicada; `yarn format:check` será confirmado na CI do commit seguinte. | `fa3f21e7871f15a1b4ea13257b70ed62ca7124d4` |
| 2026-10-20 | 5 | Corrigidos problemas TypeScript/React em componentes de navegação, feeds, compositor e conversas diretas; restaurado import `countableText` do upstream. | JavaScript Testing passou no SHA `967b741`; lint e demais verificações ainda pendentes. | `8e4c64eee01adb26913b46c0c5d2a77597bf0440` / `15bbff53101a2abb9fbae64d60126eb0dc2458dd` |
| 2026-10-20 | 6 | Aplicada nova rodada de formatação em `column_header`, `account_edit`, `pinned_feeds`, `bug_report_modal` e `gif_picker`. | CI do SHA `967b741` ainda apontou 7 arquivos; esta rodada corrige visibilidade, conversa, import do composer e o próprio registro. | `967b741ea52d005e15418214f4a6632ac3e0e8db` |
| 2026-10-20 | 7 | Primeira correção dos dois findings restantes em `message_conversation.tsx` no commit `0efcc484`. | A CI revelou que a assinatura genérica escolhida para `useAppSelector` estava errada e elevou o ESLint a 77 erros; esta tentativa não foi considerada validada. | `0efcc484d162da4f49e0aea9dab077cfc3b5da1f` |
| 2026-10-20 | 8 | Reconciliado o schema com a migração FASP: a coluna `fasp_providers.capabilities` não deve existir após a migração, pois os dados são transferidos para `fasp_capabilities`; mantidas as duas colunas realmente ausentes adicionadas anteriormente. | Correção de `db/schema.rb` publicada; o teste histórico foi reiniciado para confirmar o resultado. | `b4ab81f9bef14a7b27cb002cc4412ea3a31c4e33` |
| 2026-10-20 | 9 | Removidos os quatro workflows temporários de autocorreção ESLint, formatação e RuboCop, que tinham permissões de escrita e não devem ficar permanentes no repositório. | Exclusão aplicada em um único commit; o branch volta a não conter essas automações auxiliares. | `7cb2283839dafbf0d0b37d801944aeb7c830b4cf` |
| 2026-10-20 | 10 | Corrigido o hook selector usando os dois genéricos necessários (`RootState` e tipo selecionado), e trocada a flag local mutável por um objeto `current` para evitar a falsa condição de cancelamento detectada pelo ESLint. | Nova execução completa da CI iniciada no SHA atual; resultados de ESLint, testes Ruby/E2E e migrações ainda precisam ser confirmados antes da validação. | `0aa9cbe36c65a2576b855fb5c3f1a7244586db94` |

## Referências da execução

- Branch de teste: [BlueLab-Test](https://github.com/lucascasanho/BlueLab/tree/BlueLab-Test)
- PR de validação (não mesclar): [#201 — QA only: validate Mastodon 5.0.0-alpha.1 merge on BlueLab-Test](https://github.com/lucascasanho/BlueLab/pull/201)
- CI atual do ESLint: [JavaScript Linting](https://github.com/lucascasanho/BlueLab/actions/runs/39374581250)
- CI atual de JavaScript: [JavaScript Testing](https://github.com/lucascasanho/BlueLab/actions/runs/39374581407)
- CI atual de formatação: [Check formatting](https://github.com/lucascasanho/BlueLab/actions/runs/39374581442)
- CI atual das migrações históricas: [Historical data migration test](https://github.com/lucascasanho/BlueLab/actions/runs/39374581255)
- CI atual de RSpec/E2E: [Ruby Testing](https://github.com/lucascasanho/BlueLab/actions/runs/39374581317)
- CI atual da imagem de teste: [Test container image build](https://github.com/lucascasanho/BlueLab/actions/runs/39374581343)
