# Mastodon 5.0.0-alpha.1 — checkpoint de integração BlueLab

Atualizado em: 2026-10-20 (UTC)  
Repositório: [lucascasanho/BlueLab](https://github.com/lucascasanho/BlueLab)  
Canal de trabalho: `BlueLab-Test`  
SHA auditado no início desta retomada: `70c69b0a3b0eff0ab9df6ea36c9b0f8974947cea`  
Estado: **em correção e validação; não considerar pronto para aprovação**. Último commit de código auditado neste checkpoint: `4dd73682bdf83f7226ae5aad7af4a11123aac317`; as validações automatizadas desse conjunto de correções ainda estão pendentes.

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
- O primeiro bloqueio E2E (`Themes#available_theme_colors` ausente e `config/themes.yml` no formato antigo) foi corrigido na etapa 2 pelo commit `b573c59c`. Uma rodada posterior identificou `User#setting_theme_color` ausente no helper de tema; o accessor e um teste unitário foram adicionados no commit `1440c38c`. A correção precisa ser confirmada por uma nova rodada E2E.
- A CI Ruby do SHA `bc5bbed` revelou que `BugReportsController#sanitize_path` chamava `truncate` sobre `nil` quando `current_path` era uma string vazia (`''.split('?').first`); esse cenário já é coberto pelo spec de relato iniciado numa página de erro. A correção em `007ddc85` transforma a primeira parte ausente em string vazia antes de truncar.
- Também há evidência de discrepância entre migrações e `db/schema.rb`: o modelo/testes de selo de verificação usam `verified_badge_visible`, coluna ausente do schema exportado, apesar de existir a migração `db/migrate/20260926151300_add_verified_badge_visible_to_accounts.rb`.
- O commit `8b2c6e8281065a0bd968d9134920bc36ff78b3da` já tentou incluir tabelas BlueLab no schema, mas a execução atual demonstra que é necessário conferir a cobertura de colunas/tabelas customizadas, não apenas o nome do commit.
- O PR #201 usa `qa/mastodon-5-alpha-validation-20261019` como base e `BlueLab-Test` como head, foi criado exclusivamente para disparar CI e **não deve ser mesclado**.

## Diagnóstico de formatação temporário

Um workflow de diagnóstico `.github/workflows/format-diff-debug.yml`, com permissão somente de leitura (`contents: read`), foi usado para executar `yarn format` em um checkout descartável e imprimir o diff exato. O workflow temporário foi removido após o uso; não teve permissão para gravar arquivos e não realizou commit automático.

## Auditoria de divergência com o canal estável

Em 2026-10-20, a comparação dos branches indicou commits exclusivos de ambos os lados; o branch de teste contém a base Mastodon 5 alpha e não pode receber um merge geral do estável sem revisão. Foram comparados os arquivos dos commits estáveis recentes relacionados a PWA, ícones de resposta e layout:

- A tela de instalação PWA de `BlueLab-Test` já contém a estrutura com título, mensagem e ações separadas; o código e SCSS no teste são mais completos que os arquivos estáveis antigos. Mantida a versão do teste.
- `app/serializers/manifest_serializer.rb` no teste escolhe as dimensões de screenshots conforme a instância (`mastodon-blue`: 473x936 e 1891x936; `espelunca-social`: 471x939 e 1890x940). A versão estável analisada possuía dimensões hard-coded para Espelunca. Mantida a versão do teste.
- A migração FASP `20260925094651_create_fasp_capabilities.rb` move os dados de `fasp_providers.capabilities` para `fasp_capabilities` e remove a coluna legada. O schema corrente foi rechecado e não inclui essa coluna; por isso o checkpoint foi corrigido para não classificar sua ausência como erro.
- Os screenshots `espelunca-social-narrow.png` e `espelunca-social-wide.png` têm os mesmos blobs em ambos os branches; os screenshots `mastodon-blue-narrow.png` e `mastodon-blue-wide.png` do teste são mais recentes e foram preservados.
- As correções de ícones de resposta no componente legado e no componente de status estão presentes no teste; o filtro de notificações já tinha a mesma lógica de escolher `StatusReplyIcon`/ícone legado conforme o redesign.
- Portadas seletivamente as diferenças confirmadas: remover a regra CSS antiga que deslocava o botão de voltar ao topo, e restaurar a ação de política de citação só para o menu legado. Não foi feito merge nem cherry-pick cego do histórico estável.

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
- [ ] Confirmar a formatação com o job oficial `Check formatting`; o diff exato de `yarn format` foi aplicado aos arquivos de código apontados e ao checkpoint. O workflow original `yarn format:check` permaneceu intacto.
- [ ] Resolver erros ESLint/TypeScript concretos no código atual; não suprimir regras globalmente para mascarar problemas.
- [ ] Rodar os comandos focados e o conjunto de lint JS.
- [ ] Registrar quantidade de erros antes/depois e quaisquer bloqueios remanescentes.

### Etapa 5 — matriz Ruby, testes completos e validação do canal

- [x] Confirmar a versão Ruby exigida por `.ruby-version` e `Gemfile`: Ruby 4.0.7.
- [x] Distinguir incompatibilidade da matriz CI de falhas reais; workflow ajustado com base no upstream atual, que testa apenas a versão de `.ruby-version`.
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
| 2026-10-20 | 3 | Reconciliado o schema com as migrações; as duas colunas confirmadas como ausentes foram `account_conversations.last_read_status_id` e `accounts.verified_badge_visible`. O campo antigo `fasp_providers.capabilities` é removido pela migração que normaliza os recursos em `fasp_capabilities` e não deve aparecer no schema final. | A estrutura atual de `db/schema.rb` reflete essa remoção; teste histórico de migração e RSpec continuam pendentes de CI. O commit intermediário `dbd20c5` chegou a acrescentar o campo legado e não deve ser interpretado como estado final. | `dbd20c5ff56eb4b641cde8e2de643c99d27790c9` |
| 2026-10-20 | 4 | Corrigida a formatação dos dois blocos de callback em `bug_report_modal.tsx`, único arquivo indicado pelo `yarn format:check`. | Alteração publicada; `yarn format:check` será confirmado na CI do commit seguinte. | `fa3f21e7871f15a1b4ea13257b70ed62ca7124d4` |
| 2026-10-20 | 5 | Corrigidos problemas TypeScript/React em componentes de navegação, feeds, compositor e conversas diretas; restaurado import `countableText` do upstream. | JavaScript Testing passou no SHA `967b741`; lint e demais verificações ainda pendentes. | `8e4c64eee01adb26913b46c0c5d2a77597bf0440` / `15bbff53101a2abb9fbae64d60126eb0dc2458dd` |
| 2026-10-20 | 6 | Aplicada nova rodada de formatação em `column_header`, `account_edit`, `pinned_feeds`, `bug_report_modal` e `gif_picker`. | CI do SHA `967b741` ainda apontou 7 arquivos; esta rodada corrige visibilidade, conversa, import do composer e o próprio registro. | `967b741ea52d005e15418214f4a6632ac3e0e8db` |
| 2026-10-20 | 7 | Primeira correção dos dois findings restantes em `message_conversation.tsx` no commit `0efcc484`. | A CI revelou que a assinatura genérica escolhida para `useAppSelector` estava errada e elevou o ESLint a 77 erros; esta tentativa não foi considerada validada. | `0efcc484d162da4f49e0aea9dab077cfc3b5da1f` |
| 2026-10-20 | 8 | Reconciliado o schema com a migração FASP: a coluna `fasp_providers.capabilities` não deve existir após a migração, pois os dados são transferidos para `fasp_capabilities`; mantidas as duas colunas realmente ausentes adicionadas anteriormente. | Correção de `db/schema.rb` publicada; o teste histórico foi reiniciado para confirmar o resultado. | `b4ab81f9bef14a7b27cb002cc4412ea3a31c4e33` |
| 2026-10-20 | 9 | Removidos os quatro workflows temporários de autocorreção ESLint, formatação e RuboCop, que tinham permissões de escrita e não devem ficar permanentes no repositório. | Exclusão aplicada em um único commit; o branch volta a não conter essas automações auxiliares. | `7cb2283839dafbf0d0b37d801944aeb7c830b4cf` |
| 2026-10-20 | 10 | Corrigido o hook selector para usar os dois genéricos necessários (`RootState` e tipo selecionado). A tentativa com apenas um genérico foi descartada após a CI reportar 77 erros; a correção de tipos foi aplicada depois. | A CI do SHA inicial `0aa9cbe` ainda precisa ser distinguida dos resultados da revisão mais recente. | `0aa9cbe36c65a2576b855fb5c3f1a7244586db94` |
| 2026-10-20 | 11 | Restaurado o accessor `User#setting_theme_color` em `User::HasSettings` e adicionado teste unitário que verifica a leitura de `web.theme_color`. | Corrige a causa confirmada de HTTP 500 em E2E; ainda depende de uma nova execução Ruby/E2E. | `1440c38caa507c27f030caee01375b7971700fa4` |
| 2026-10-20 | 12 | Alinhada a matriz de Ruby de `test-ruby.yml` à versão declarada pelo projeto: removidos os jobs incompatíveis Ruby 3.3/3.4 e mantidas as três combinações de pesquisa na Ruby `.ruby-version` (4.0.7). | Comparado com `mastodon/mastodon/.github/workflows/test-ruby.yml` no commit upstream `55090c5ac5ca4d1c94c3e7de573e4ea90b731e54`. Nova CI ainda pendente. | `8546a9b75201d0ef5d061965de99276510b9e43c` |
| 2026-10-20 | 13 | Temporariamente alterado o workflow de formatação para executar Oxfmt sem gravação no repositório e imprimir o diff no log. Isso foi usado apenas para obter a formatação oficial de `message_conversation.tsx`; o workflow será restaurado antes de terminar. | Oxfmt identificou um único ajuste no formato do seletor `statuses`; diff aplicado nesta revisão. | `980023f78c538d90187bc847c1cc32e91e07b447` |
| 2026-10-20 | 14 | Tornada dinâmica a verificação de cancelamento em `message_conversation.tsx` para corrigir o último erro `no-unnecessary-condition` do ESLint. | O lint do commit anterior ainda falhava nessa condição; a CI precisa confirmar a correção no SHA final. | `9619a6618ed39a849ef889a488fcce6187b2f026` |
| 2026-10-20 | 15 | Aplicado o diff exato gerado pelo Oxfmt ao seletor de mensagens diretas e consolidada a tabela de progresso em uma única tabela ignorada pelo formatador. | A CI final de formatação e lint será iniciada depois da restauração do workflow original. | SHA desta revisão a registrar no checkpoint final |

| 2026-10-20 | 16 | Corrigido o acesso ao cabeçalho `x-request-id` com narrowing via `unknown`, sem invocar a API `.get()` incompatível com Axios headers. | O patch está no branch; a CI do SHA final ainda precisa confirmar typecheck e ESLint. | `15cd6530c76d94ab03151d73d1c67f876eb1d476` |
| 2026-10-20 | 17 | Tipada explicitamente a função de cópia localizada do modal de bug reports e garantida uma cópia de fallback definida. | Correção publicada; validação automatizada pendente. | `12b65f9fb0d511661ff2bc19ddeb10cbdea5ca18` |
| 2026-10-20 | 18 | Protegidos acessos ao primeiro segmento do caminho nos diagnósticos de cliente contra `noUncheckedIndexedAccess`. | Correção publicada; validação automatizada pendente. | `9649448bbde38ff7167d0bd850b7ad4ba523b497` |
| 2026-10-20 | 19 | Substituída a variável inexistente `isRedesign` pela função upstream `isRedesignEnabled()` no ícone de resposta. | Correção publicada; validação automatizada pendente. | `efd7cb54a5327487fe3f72cb2e71b88f10ea9957` |
| 2026-10-20 | 20 | Passado callback explícito `accept` ao stream de hashtags após mudança da assinatura upstream para quatro argumentos. | Correção publicada; validação automatizada pendente. | `158c385e53778e423e850a8970696c5293f0aa9f` |
| 2026-10-20 | 21 | Removida propriedade duplicada `compose` do estado da story do compositor redesign. | Corrige TS1117 confirmado pelo typecheck anterior; CI do SHA final pendente. | `80c697b8016cd8179ebf04a2e4cbc4f21abc4404` |
| 2026-10-20 | 22 | Mantida acessível a escolha de modo de mensagem direta, removendo o retorno antecipado que tornava a opção `ComposeDirectMenu` inalcançável e estreitava incorretamente o tipo. | Correção publicada; verificar lint e interação do compositor. | `abafec586d785dd8e670a6449585436f12f65578` |
| 2026-10-20 | 23 | Acrescentados fallbacks de string para as classes CSS opcionais nas abas de feeds fixadas do BlueLab. | Correção publicada para dois erros TS2322; validar no typecheck seguinte. | `738f5cb13240f1c7132fffdea4007b3655f02cbf` |
| 2026-10-20 | 24 | Tornadas seguras leituras opcionais em testes do cofre de contas do navegador. | Correção publicada para TS2532; validar no typecheck seguinte. | `368cbe5cb350b099dd3851d8c9ced932249d2e12` |
| 2026-10-20 | 25 | Explicitado `onOpenConversation={undefined}` na lista da timeline legada para satisfazer a inferência PropTypes sem alterar o comportamento de navegação legado. | Correção publicada; validação de typecheck/E2E pendente. | `b121c4cf755666ed11871de87da3be26bc0d3236` |
| 2026-10-20 | 26 | Substituídas chaves computadas `classes.unread` por argumentos de classe condicionais nas notificações de verificação e de solicitação administrativa. | Correção publicada para TS2464; validar no typecheck seguinte. | `6894113eebba0b36b7358b0cf11558429c7b11ba` |
| 2026-10-20 | 27 | Adicionado o modelo interno `NotificationGroupAdminVerificationRequest` e incluído na união `NotificationGroup`. | Corrige incompatibilidade entre `NotificationType` da API e a união do modelo; validação pendente. | `8466ddc3ba50ff9027d7a08c1aef8088396e9f5a` |
| 2026-10-20 | 28 | Adicionada a chave `explore` à tipagem e aos 13 idiomas já existentes no dicionário BlueLab, preservando a tradução específica do item de navegação. | Patch publicado; typecheck e revisão de traduções pendentes. | `90157e1c1ee1f627bb36c605425ebb0ed080d5e0` |

| 2026-10-20 | 29 | Restaurada a prop `withSpaceAfter` ausente no `NavigationLink` do Mastodon 5 e criado modificador CSS para manter espaçamento intencional dos links BlueLab. | Corrige incompatibilidades de props no painel de navegação; CI do novo SHA pendente. | `79ed64ac8a19caa0a99618b2a31d08a0c3ecb0d8` / `7ca229338560f5e11a459b42dcbcd7f855c1050e` |
| 2026-10-20 | 30 | Removidos atributos `title` não suportados nos `IconButton` do editor rico; os filhos já fornecem o texto acessível do tooltip. | Correção publicada; lint/typecheck pendentes. | `95ada28b14b2089392b8e106f5312f60bcfbbfcf` |
| 2026-10-20 | 31 | Removido `title` não suportado do botão de agendamento; a legenda interna alimenta o tooltip. | Correção publicada; lint/typecheck pendentes. | `96b4f864c1373225b34136a7ef30bbad198d2c80` |
| 2026-10-20 | 32 | Removidos atributos `title` não suportados dos botões de remover item/mídia do compositor por thread. | Correção publicada; lint/typecheck pendentes. | `e72d708f7e181890284787dd23ed655f3bdc4636` |
| 2026-10-20 | 33 | Removidos dois atributos `title` não suportados na barra de formatação, usando o texto de filhos como tooltip acessível. | Correção publicada; lint/typecheck pendentes. | `88e4e85624b9cc44c982cddf1140c09fea11f501` |
| 2026-10-20 | 34 | Removido `title` não suportado do botão de adicionar item à thread. | Correção publicada; lint/typecheck pendentes. | `13ba3a8d332e2e11e2a9ca773bbe0d2c5603c6be` |
| 2026-10-20 | 35 | Migrados quatro controles da barra de ações para o componente `Tooltip` oficial, substituindo a prop obsoleta `tooltip` e preservando rótulos acessíveis. | Patch publicado; aguardar TypeScript, ESLint e testes de interface. | `0af6db5804d27e96bf48b4b4c795dddf42b68759` |
| 2026-10-20 | 36 | Removido `title` não suportado do botão de favorito na página de status; o filho fornece o texto do tooltip. | Correção publicada no HEAD `cc4f1ef3876e7840ac4af36a9cbbc55c3ca9ab6f`; CI iniciada e ainda pendente. | `cc4f1ef3876e7840ac4af36a9cbbc55c3ca9ab6f` |

| 2026-10-20 | 37 | Corrigida a renderização de mensagens diretas para consumir `content` do modelo de status, estreitar as contas ao tipo adequado, tratar anexos/menções do estado imutável legado e evitar chaves CSS computadas opcionais. | Patch publicado; aguarda validação TypeScript e de runtime. | `c35292e1f7e15be30f85ea82987818f8f4f7d58e` |
| 2026-10-20 | 38 | Removido cast local para o estado de navegação e adotado `location.state?.statusId`, depois de ampliar `MastodonLocationState` com `statusId?: string` documentado para recuperação da conversa de origem. | Corrige incompatibilidade do tipo de estado em `browserHistory.replace`; CI pendente. | `eb8595da33c8a07130cb77a4e545671cee4e372f` / `b03a6fa3b6a9833b34176ea165860672b488f53a` |
| 2026-10-20 | 39 | Protegido o teste de agrupamento de conversas contra representante ausente com erro explícito, eliminando acessos não estreitados a `undefined`. | Correção de teste publicada; JavaScript Testing e TypeScript do SHA mais recente ainda pendentes. | `44d49d2414f4d086b7c6a4b8692d66fd784f7314` |

| 2026-10-20 | 40 | Feito narrowing explícito do tipo de conta da resposta relacionada, evitando converter diretamente uma string do modelo de status no tipo de conta esperado pelo componente. | Correção publicada; TypeScript/ESLint ainda pendentes. | `0e76a843327d8deb1647e5c6c45c84edfdff2de7` |
| 2026-10-20 | 41 | Evitada navegação para conversa inexistente ao validar IDs recuperados; o scroll pendente agora é associado ao ID da conversa e deixa de ser apagado sincronamente dentro de um efeito. | Correção funcional publicada; lint, testes JS e E2E pendentes. | `551d3188bcb26f4ccd85aeb7545c412fe5c8f339` |

| 2026-10-20 | 42 | Portada do estável a correção do scroll-to-top: removido o override desktop antigo que alterava `left` no tema BlueLab, preservando o posicionamento responsivo atual. | Patch aplicado em `BlueLab-Test`; CI ainda pendente. | `45d1a9f0c706acaaa823c006d123e14a1aa9bda8` |
| 2026-10-20 | 43 | Restaurada a ação de mudança de política de citação no menu da interface legada, condicionada a `!isRedesignEnabled()`, sem expô-la no redesign. | Portado seletivamente do estável após comparação de arquivos; CI pendente. | `75ff3a9e54c74a7ea0c569ce75424f171452e47e` |

| 2026-10-20 | 44 | Estreitado o tipo da classe CSS opcional `headless` no compositor redesign para evitar argumento de tipo de erro no `classNames`. | Correção publicada; confirmar no TypeScript/ESLint da rodada atual. | `3868256066ef1a53460c5619d8ebe6ffdeca46bf` |
| 2026-10-20 | 45 | Corrigidos os 13 diagnósticos ESLint restantes no SHA `bc5bbed`: escopo de `useIntl`, remoção de cast redundante e tipagem do estado de navegação/conteúdo na conversa direta. | Correções publicadas; lint, Ruby e E2E da nova rodada ainda pendentes. | `b9c4d96e5989c11a51b1bb543d87a0e42fe6f0d7` |
| 2026-10-20 | 46 | Corrigido o caminho vazio no sanitizador de relatos e aplicado o primeiro conjunto de alterações exatas reportadas pelo Oxfmt. | O spec de erro iniciado com `current_path: ''` cobre a regressão; confirmar no RSpec. | `007ddc85983b0cb26a13ddc0634eafbf14c18725` |
| 2026-10-20 | 47 | Aplicada a formatação oficial em imports e casts do compositor e da conversa direta, conforme o diff do Oxfmt. | Formatação corrigida no branch de teste; confirmação oficial pendente. | `d4385cc3bdaffcd08f1c74f4f4e7b8d30c0af2a6` |
| 2026-10-20 | 48 | Aplicadas as últimas correções Oxfmt em navegação, página de status e tipos de grupos de notificação. | Formatação corrigida no branch de teste; confirmação oficial pendente. | `4dd73682bdf83f7226ae5aad7af4a11123aac317` |

## Referências da execução

- Branch de teste: [BlueLab-Test](https://github.com/lucascasanho/BlueLab/tree/BlueLab-Test)
- PR de validação (não mesclar): [#201 — QA only: validate Mastodon 5.0.0-alpha.1 merge on BlueLab-Test](https://github.com/lucascasanho/BlueLab/pull/201)
- CI de TypeScript/ESLint para validar a rodada de mensagens diretas: [JavaScript Linting](https://github.com/lucascasanho/BlueLab/actions/runs/39380051116)
- CI de testes JavaScript: [JavaScript Testing](https://github.com/lucascasanho/BlueLab/actions/runs/39380051045)
- CI de formatação: [Check formatting](https://github.com/lucascasanho/BlueLab/actions/runs/39380051096)
- CI das migrações históricas: [Historical data migration test](https://github.com/lucascasanho/BlueLab/actions/runs/39380051097)
- CI de RSpec/E2E: [Ruby Testing](https://github.com/lucascasanho/BlueLab/actions/runs/39380051113)
- CI da imagem de teste: [Test container image build](https://github.com/lucascasanho/BlueLab/actions/runs/39380051214)
