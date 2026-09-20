# Mapa de acoplamento e hotspots

## Critério

- **A**: pode permanecer completamente separado.
- **B**: módulo BlueLab com ponto de integração pequeno.
- **C**: modifica upstream e ainda não possui fronteira suficiente.
- **D**: estrutural ou sensível; requer reconciliação humana/semântica.

## Hotspots confirmados na auditoria inicial

| Área                        | Arquivos upstream modificados / integração              | Classe | Risco e tratamento                                                                     |
| --------------------------- | ------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Shell BlueLab 2             | `features/ui/**`, navigation panel, columns, timelines  | B/C    | alto volume frontend; extrair integrações por domínio, não copiar componentes upstream |
| Composer                    | `features/compose/**`, reducers, actions, hotkeys       | C      | muito alto; preservar estado/publicação e migrar por comportamento testado             |
| Tema                        | entrypoints e estilos Mastodon                          | B/C    | alto; preferir tema/entrypoint e tokens em vez de sobrescrever CSS upstream            |
| Perfil/editor de emoji      | account header, account edit, form fields               | B/C    | alto; módulos `blue2_emoji_*` já ajudam, mas chamadas upstream seguem acopladas        |
| Status/quotes/mídia         | status components, APIs e serviços                      | B/C    | alto; manter compatibilidade de serialização e publicação                              |
| Passkeys/sessão             | controllers auth, WebAuthn, settings, initializer       | D      | AUTH_SENSITIVE; jamais resolver por ours/theirs ou driver genérico                     |
| Cadastro e rate limiting    | registrations, `/api/v1/accounts`, Rack Attack, modelos | D      | SECURITY_SENSITIVE; revisão semântica e specs obrigatórias                             |
| Upload retomável            | rotas/API `api/v1/blue`, serviços, models, migrations   | B/D    | integração de rotas pequena; protocolo, validação e banco são sensíveis                |
| Username/verificação remota | models, services, controllers, migrations               | C/D    | API e banco; preservar validações upstream e migrar só com testes                      |
| Agendamento em threads      | controllers, services, models, migrations               | B/D    | domínio próprio, mas toca publicação e schema                                          |
| Branding/admin              | settings, serializers, views, locais                    | B/C    | separar adaptadores de configuração e manter compatibilidade de settings               |
| Homepage/onboarding         | controllers públicos, auth layouts e UI client          | B/C    | preservar rotas, acesso anônimo e login; testar transição público→sessão               |
| Retenção de conteúdo        | admin settings e schedulers                             | C/D    | lifecycle e dados; revisar semanticamente mudanças upstream correlatas                 |
| PWA/service worker          | entrypoint, caching e mobile UI                         | B      | manter módulo cliente; validar cache sem esconder correção upstream                    |
| Ferramentas de deploy       | `bin/`, workflows, CLI e nginx                          | C/D    | pipeline sensível; será substituído por worktree transacional                          |
| Status page/Cloudflare      | `status-page/`, `infrastructure/`                       | A      | produto adjacente, sem merge driver Mastodon                                           |
| Atualizador existente       | `bin/bluelab`                                           | C/D    | faz deploy e usa `reset --hard`; será redesenhado apenas na fase 6, após inventário    |

## Proibição operacional dos hotspots D

Conflitos em authentication, authorization, sessões, OAuth, WebAuthn/passkeys,
criptografia, validações de upload, sanitização, schema ou migrations recebem as
classificações `AUTH_SENSITIVE`, `SECURITY_SENSITIVE` ou `DATABASE_SENSITIVE` e
terminam em `NEEDS_SEMANTIC_REVIEW` até haver evidência suficiente. `rerere` e merge
drivers nunca têm autoridade para aceitá-los automaticamente.

## Próxima redução de acoplamento

### Decisão registrada: catálogo de rótulos do shell Blue2

O primeiro integration point **B** de baixo risco é o catálogo puro
`blue2Text(locale, key)`. Ele concentra as mensagens específicas do shell Blue2 e
é consumido por componentes de navegação e de UI, mas não lê estado, não despacha
ações, não altera rotas e não contém markup ou estilos.

| Item                     | Decisão                                                                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proprietário BlueLab     | `app/javascript/bluelab/i18n/blue2.ts`                                                                                                                                                                     |
| Contrato de integração   | export estático `blue2Text(locale, key)` e o tipo `Blue2TextKey`                                                                                                                                           |
| Consumidores a preservar | `features/blue2/navigation.tsx`, `right_rail.tsx`, `features/ui/components/columns_area/redesign.tsx`, `features/navigation_panel/redesign/{header,index}.tsx` e `features/direct_timeline/index.tsx`      |
| Fora de escopo           | componentes, SCSS, navegação, composer, timelines, reducers e ações                                                                                                                                        |
| Evidência                | os testes existentes de menu Blue2 e painel de navegação cobrem os consumidores; a fronteira nova requer teste unitário do fallback de locale e dos rótulos em `app/javascript/bluelab/i18n/blue2.test.ts` |

Esta é uma fronteira B porque o Mastodon depende apenas de uma função síncrona e
tipada, enquanto o conteúdo BlueLab pode evoluir no seu próprio diretório. A
extração não deve modificar os textos, a estratégia de fallback nem o comportamento
dos consumidores. Qualquer próxima extração do shell (componentes, barras móveis ou
painéis) continua fora desta decisão e deve passar por uma nova análise.
