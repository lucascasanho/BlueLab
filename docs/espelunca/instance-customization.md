# Customização administrativa da instância

Esta é uma customização da Espelunca sobre o Mastodon oficial. Ela foi
concentrada para reduzir conflitos durante merges com o upstream.

## Arquitetura

- A página fica em `Administração → Customização da instância` e exige a
  permissão nativa `manage_settings`.
- `Form::InstanceCustomization` contém a allowlist, conversão de tipos e
  validações. Para adicionar um valor escalar, inclua-o no formulário e em
  `config/settings.yml`.
- Valores escalares usam a tabela e o cache nativos de `Setting`. A invalidação
  ocorre nos callbacks do model; salvar no painel não exige restart.
- Logos de autenticação e email usam `SiteUpload`, o armazenamento Paperclip já
  configurado para a instância e a invalidação de cache nativa. São aceitos
  somente PNG, JPEG e WebP quadrados, entre 64 px e o limite global de pixels,
  com menos de 2 MB.
- Favicon, ícones PWA/Apple e thumbnail OpenGraph permanecem na página nativa
  `Marca`, que já possui estilos e consumidores próprios. Os SVG internos da
  SPA continuam versionados; o painel nunca aceita SVG arbitrário.
- Alterações geram `Admin::ActionLog` com valores anteriores, novos e opções
  restauradas.

## Valores e limites

| Setting                               |    Padrão |                                  Faixa segura |
| ------------------------------------- | --------: | --------------------------------------------: |
| `status_character_limit`              |       500 |                          1–100.000 caracteres |
| `admin_status_character_limit`        |    10.000 |               limite comum–100.000 caracteres |
| `hide_status_character_counter`       |   `false` |                        contador comum visível |
| `hide_admin_status_character_counter` |   `false` |               contador administrativo visível |
| `media_image_size_limit_mb`           |    100 MB |                                      1–100 MB |
| `media_video_size_limit_mb`           |  1.024 MB |                                    1–1.024 MB |
| `instance_accent_color`               | `#6364ff` |   hexadecimal validado e contraste mínimo 3:1 |
| `email_primary_color`                 | `#6364ff` |   hexadecimal validado e contraste mínimo 3:1 |
| `email_button_color`                  | `#6364ff` |   hexadecimal validado e contraste mínimo 3:1 |
| `email_link_color`                    | `#5638cc` | hexadecimal validado e contraste mínimo 4,5:1 |

Somente `role.administrator?` recebe o limite administrativo. Permissões de
moderação isoladas não concedem esse limite. O model `Status` continua sendo a
barreira de segurança para web e API. A API pública anuncia o limite comum,
pois o schema Mastodon possui apenas um campo global; o compositor autenticado
recebe o limite efetivo pelo initial state.

A visibilidade do contador também é enviada pelo initial state conforme a
categoria da conta autenticada. Ocultá-lo não altera a validação: ao exceder o
limite, o contador reaparece em estado de erro. As duas flags são independentes.

Os limites de mídia nunca ultrapassam os tetos técnicos versionados de 100 MB
para imagem e 1 GB para vídeo. Validadores, downloads federados, transcoder e
serializadores da API consomem o valor dinâmico.

## Aparência e email

A cor de destaque é emitida após o tema selecionado e sobrescreve somente
tokens semânticos de marca. Neutros de cada tema são preservados; hover e
superfícies suaves são derivados com `color-mix()`. A cor textual é clareada no
tema escuro e escurecida no tema claro para preservar contraste. Valores são
estritamente `#RRGGBB`, impedindo injeção de CSS.

As cores de email são aplicadas a seletores estruturados, sem editor de HTML.
O logo de email é usado no cabeçalho e rodapé; o logo de autenticação cobre os
fluxos de cadastro, confirmação e login e também fornece o ícone da SPA nos
temas compatíveis. Sem uploads, os fallbacks versionados são os do Mastodon.
Os logos próprios da Espelunca em produção foram migrados para `SiteUpload`, de
modo que não sejam defaults do futuro BlueLab.
O nome apresentado pelo WebAuthn deriva do domínio configurado, em vez de usar
uma marca de instância codificada no fork.

## Limitações deliberadas

- O nginx desta instalação possui `client_max_body_size 99m`. Ele bloqueia
  uploads maiores antes do Rails; o painel apenas alerta e não altera nginx,
  Cloudflare ou túneis.
- Limites de nome, bio, campos, enquete, avatar/header e anexos continuam nas
  constantes upstream. Eles não foram expostos porque exigiriam alterar vários
  contratos e processadores e não seriam seguros nesta etapa.
- Emojis Unicode já entram como caracteres reais. Custom emojis continuam como
  shortcodes no `textarea` e são renderizados no preview. Uma renderização
  inline exigiria substituir o editor e comprometeria IME, cursor, seleção,
  mobile e undo/redo.
- A página não oferece HTML/CSS arbitrário nem preview completo de uma segunda
  interface. A própria amostra dos campos e imagens atuais serve como preview
  mínimo.

## Deploy e merges

Mudanças de valores feitas no painel não exigem restart. Alterações neste código
exigem rebuild dos assets e restart de `espelunca-web`; mudanças JavaScript
também devem ser servidas pelos assets novos. Sidekiq e streaming não precisam
ser reiniciados só por essa funcionalidade.

Durante merges, revisar especialmente `StatusLengthValidator`,
`MediaAttachment`, os serializers de instância, `ThemeHelper`, `SiteUpload` e os
componentes compartilhados `DisplayName`/`AccountHeader`.
