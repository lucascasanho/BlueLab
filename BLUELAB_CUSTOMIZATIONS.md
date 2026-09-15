# Invariantes de customização do BlueLab

O BlueLab é uma distribuição customizada do Mastodon. Atualizações do Mastodon oficial são entradas para o BlueLab, nunca substituições do comportamento do BlueLab.

## Canais oficiais

- `bluelab`: estado estável e único canal consumido pela Espelunca.
- `bluelab-teste`: estado destinado ao mastodon.blue para validação antes de promoção.

Os nomes antigos `BlueLab`, `BlueLab-Test` e `BlueLab-Testing` são apenas referências de transição e não devem receber novas implementações.

## Regra de integração

Ao sincronizar uma nova versão oficial do Mastodon:

1. Partir do estado atual de `bluelab`.
2. Integrar ou portar as mudanças upstream em um estado isolado.
3. Resolver conflitos preservando o comportamento BlueLab, exceto quando uma adaptação for necessária por compatibilidade ou segurança.
4. Nunca substituir arquivos customizados inteiros por versões upstream apenas para eliminar conflitos.
5. Validar o resultado antes de colocá-lo em `bluelab-teste`.
6. Testar esse SHA no mastodon.blue.
7. Promover para `bluelab` exatamente o SHA testado, sem incluir commits posteriores.

## Comportamentos protegidos

As seguintes características precisam sobreviver a atualizações upstream:

- Tema `blue-2`, registrado e exibido como **BlueLab**.
- Experiência BlueLab 2.0 completa, incluindo navegação, menu de conta, acionador do compose, ícones, coluna lateral direita, comportamento de rolagem, layout de coluna única/mobile e apresentação de mensagens.
- Quando o upstream renomear ou substituir um componente usado pelo BlueLab, o comportamento BlueLab deve ser portado para a nova estrutura em vez de ser descartado.
- Homepage pública `/overview`, ações de cadastro quando permitido, login normal, login com passkey e opção de continuar navegando sem autenticação.
- Ajustes do compose BlueLab, incluindo rolagem interna no mobile, mídia/ALT, citações, cursor/emojis, safe-area e bloqueio da rolagem da coluna de fundo.
- Comunicados administrativos com editor BlueLab, texto simples ou Markdown, emojis personalizados, anexos de mídia e renderização compatível nos e-mails HTML e em texto simples.
- Branding BlueLab, limites configuráveis, controles de customização da instância, paletas administrativas, comportamento de username, passkeys e demais recursos já incorporados.
- Valores persistidos pelo painel administrativo para limites, cores claras/escuras, cores de e-mail e opções relacionadas não podem ser redefinidos por uma atualização.

## Proteção contra regressões

Sempre que possível, comportamentos protegidos devem possuir testes executáveis. Se uma atualização upstream tocar uma área protegida, implementação e teste devem ser adaptados juntos sem remover a intenção do BlueLab.

Uma atualização do Mastodon não está concluída quando apenas o código upstream foi importado. Ela só está concluída quando o resultado mantém as customizações BlueLab, preserva as configurações administrativas e passa pela validação no mastodon.blue.

## Fontes técnicas

- Mastodon oficial: https://github.com/mastodon/mastodon
- Git merge: https://git-scm.com/docs/git-merge
- Git worktree: https://git-scm.com/docs/git-worktree
