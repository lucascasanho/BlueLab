# Navegação local de links federados

A interface web da Espelunca tenta abrir localmente links HTTPS externos que
tenham formatos comuns de contas e publicações ActivityPub. A URL canônica
permanece no atributo `href` e não é alterada no conteúdo armazenado nem nas
APIs.

Em um clique simples, `HandledLink` usa a action upstream `openURL`, que consulta
`GET /api/v2/search` com `resolve=true`. Um status resolvido é aberto em
`/@<acct>/<id-local>` e uma conta resolvida em `/@<acct>`. Resultados vazios,
timeouts e erros seguem para a URL externa original. Cliques modificados não são
interceptados.

O frontend mantém por sessão um cache de até 100 URLs e compartilha a Promise de
resoluções simultâneas. A busca continua sendo feita pelo backend do Mastodon,
preservando suas validações e proteções contra SSRF.

## Escopo

A interceptação é centralizada no componente que renderiza links de HTML
federado e reconhece formatos usados por Mastodon e implementações ActivityPub
comuns. Links HTTPS comuns, como páginas da Wikipédia, não são consultados nem
interceptados. Links absolutos da própria Espelunca usam diretamente o roteador
da SPA.

Uma preferência de usuário não foi adicionada nesta primeira versão. Isso
exigiria mudanças em settings Rails, serialização do estado inicial, formulário
e traduções para controlar um comportamento que permanece pequeno e global no
frontend.

## Outros clientes

Mastodon e ActivityPub não fornecem um campo padronizado para uma instância
obrigar clientes de terceiros a abrir a representação local de um objeto remoto.
Os campos `url`, `uri` e `content` permanecem inalterados. Clientes que desejem o
mesmo comportamento podem consultar a API Mastodon padrão da Espelunca:

`GET /api/v2/search?q=<URL>&resolve=true`
