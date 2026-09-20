# Inventário de customizações BlueLab

## Método

O conjunto bruto analisado é `git diff c9b78c464b...bluelab-teste`: 789 caminhos
(379 adicionados, 410 modificados). Ele contém 1.188 commits próprios, portanto é
grande demais para ser interpretado como uma lista plana de funcionalidades. O
catálogo executável em `bluelab/manifest.yml` agrupa diferenças por domínio e aponta
para módulos, testes e integrações. Arquivos somente de formatação, sincronização
upstream, documentação ou infraestrutura são mantidos como evidência no diff, sem
serem declarados automaticamente como produto BlueLab.

## Domínios encontrados

| Domínio                | Classes                          | Evidência principal                              | Situação de isolamento              |
| ---------------------- | -------------------------------- | ------------------------------------------------ | ----------------------------------- |
| Tema e shell BlueLab 2 | THEME, UI, NAVIGATION            | `styles/blue-2.scss`, `features/blue2/`, layouts | parcialmente isolado                |
| Composer rico          | COMPOSER, REACT_COMPONENT, STATE | `features/compose/redesign/`, reducer/actions    | misto; alto hotspot                 |
| Markdown e emojis      | COMPOSER, PROFILE                | formatter Ruby e editor de campos                | misto                               |
| Perfil e identidade    | PROFILE, API, RAILS\_\*          | campos, badges, username, verificação            | misto/sensível                      |
| Mídia                  | UPLOAD, API, SERVICE, DATABASE   | API Blue de upload retomável e serviços          | bem separado, integrações restantes |
| Agendamento/threads    | API, SERVICE, DATABASE           | threads e status agendados                       | backend próprio com integrações     |
| Administração/branding | CONFIG, RAILS_CONTROLLER, UI     | personalização, cores, limites e anúncios        | misto                               |
| Autenticação/cadastro  | AUTH, PASSKEY, SECURITY          | passkeys e proteção de cadastro                  | sensível; não automatizar merge     |
| Atualização upstream   | SERVICE, DATABASE, BUILD         | checks/batches e `bin/bluelab`                   | existente, ainda não transacional   |
| Status/infrastructure  | OTHER, BUILD                     | `status-page/`, Cloudflare                       | separado do core Mastodon           |

As entradas do manifesto são o inventário operacional atual. Itens sem teste são
lacunas explícitas, não garantias implícitas.
