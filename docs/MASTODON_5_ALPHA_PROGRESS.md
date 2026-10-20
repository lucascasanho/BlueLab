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
- **Falhou:** JavaScript Linting (`app/javascript`, diversos erros TypeScript/ESLint); Check formatting (apontou `app/javascript/mastodon/features/bug_report/bug_report_modal.tsx`); testes Ruby/RSpec e E2E. Parte da matriz Ruby 3.3/3.4 falhou durante setup/instalação do Bundler; ainda é preciso validar se o workflow dessa versão alpha é coerente com as versões de Ruby suportadas.
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

- [ ] Comparar migrações customizadas, modelos, schema exportado e testes.
- [ ] Corrigir a ausência de `verified_badge_visible` e outras colunas/tabelas customizadas que a CI comprovar estarem faltando.
- [ ] Rodar o teste de migrações e testes focados do recurso de verificação.
- [ ] Registrar commit e resultados.

### Etapa 4 — lint e formatação

- [ ] Executar o formatter oficial para corrigir `bug_report_modal.tsx`, revisar diff e commitar a formatação.
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

| Data (UTC) | Etapa | Alteração | Validação | SHA |
|---|---|---|---|---|
| 2026-10-20 | 1 | Criado checkpoint com estado inicial, escopo, CI e plano de correção. | Estado inicial auditado; CI do SHA `70c69b0a3b0eff0ab9df6ea36c9b0f8974947cea` consultada. | `0a9c63a1c6392e04cfa512890d7d59cfc1db9efb` |
| 2026-10-20 | 2 | Restaurado o contrato `Themes#available_theme_colors`, atualizado `config/themes.yml` para o formato `path`/`colors` aceito pelo Mastodon atual, e adicionado teste para a paleta BlueLab. | Correção publicada no canal de teste. Testes e CI do novo SHA ainda pendentes; não declarar a etapa validada antes dos resultados. | `b573c59cf1c994d5cbc73febd10115afa54193df` |

## Referências da execução

- Branch de teste: [BlueLab-Test](https://github.com/lucascasanho/BlueLab/tree/BlueLab-Test)
- PR de validação (não mesclar): [#201 — QA only: validate Mastodon 5.0.0-alpha.1 merge on BlueLab-Test](https://github.com/lucascasanho/BlueLab/pull/201)
- Run de formatação: [Check formatting](https://github.com/lucascasanho/BlueLab/actions/runs/39368429828)
- Run do ESLint: [JavaScript Linting](https://github.com/lucascasanho/BlueLab/actions/runs/39368429790)
- Run geral de testes: [test workflows](https://github.com/lucascasanho/BlueLab/actions/runs/39368429779)
