# Checkpoint — atualização interrompida por fontes de domínios descartáveis

Data: 2026-10-20 Canal autorizado: `BlueLab-Test` Instância: mastodon.blue /
usuário local `blue`

## Falha observada

A execução de `bluelab` preservou as alterações locais no stash
`bluelab-reserva-local-blue-20261020-095545`, alinhou o checkout ao commit
`3c50eaf263`, instalou dependências Ruby e JavaScript e parou na etapa
`bin/tootctl email_domain_blocks sync_disposable`. Todas as fontes externas de
listas de domínios descartáveis retornaram HTTP 503.

O log não demonstra que migrations, assets e restart tenham sido concluídos
nessa execução. Não declarar o upgrade aplicado até a próxima execução terminar
e os healthchecks serem confirmados.

## Correção publicada

No commit `ee95150517bbd742f8bcb02556a5969ab335271d`, somente em `BlueLab-Test`,
`bin/bluelab` agora tenta sincronizar os domínios descartáveis três vezes, com
intervalo de cinco segundos. Se todas as fontes continuarem indisponíveis, emite
aviso explícito e continua o fluxo de atualização; não remove nem altera os
bloqueios já existentes. A sincronização será tentada novamente na próxima
execução.

Motivo: a sincronização depende de fontes HTTP externas e não deve impedir a
recuperação do serviço de teste quando todas estão temporariamente
indisponíveis. O aviso não significa que a lista foi atualizada.

## Retomada e validação pendentes

1. Executar novamente `bluelab` no host `blue`. O bootstrap deve atualizar o
   comando instalado a partir de `BlueLab-Test`.
2. Confirmar que migrations, precompilação de assets e restart terminam.
3. Confirmar `blue-web`, `blue-sidekiq` e `blue-streaming` ativos, healthcheck
   local e endpoint público HTTP 200.
4. Verificar a versão real via `lib/mastodon/version.rb` e o SHA implantado.
5. Conferir o stash de alterações locais; não aplicar nem descartar
   automaticamente até comparar com a árvore atual.
6. Não promover `BlueLab-Test` para `BlueLab` e não executar operações na
   Espelunca.

## Estado do teste

A alteração de código foi publicada no GitHub. Não foi possível executar Bash,
testes de integração ou deploy no host local por esta conexão; a correção ainda
precisa ser validada na execução real de `bluelab`.

---

# Checkpoint adicional — seletor de tema individual e Vanilla

Data: 2026-10-20 Canal autorizado: `BlueLab-Test`

## Problemas identificados

-A página `Aparência da conta` renderizava o seletor `instance_theme` para
administradores junto do seletor individual `bluelab_theme`. Isso misturava a
preferência pessoal com a configuração global da instância.
-`Themes::USER_SELECTABLE_NAMES` já permitia `default` (Vanilla), mas a
definição `UserSettings` ainda permitia `mastodon-5` e rejeitava `default`. Essa
divergência fazia a gravação da preferência Vanilla falhar.

## Correções publicadas em BlueLab-Test

-`5d8bb8320779370e1cc74939883fb3c3a375da6b`: remove o tratamento de
`instance_theme` do controller de preferências; a página de conta não altera
mais `Setting.theme` global. -`876494014dd7ff17f9f5af58cd1ad7b1b7953864`: remove
o seletor administrativo da página pessoal; a configuração global permanece na
tela administrativa própria. -`bb36873ae49eeee53f9a9cb06e6f6e388aaa1315`: alinha
os valores válidos de `bluelab_theme` com os temas selecionáveis, incluindo
`default`/Vanilla e removendo o identificador obsoleto `mastodon-5`.
-`f9350c1ffce88677777eeed126119214543268c6`: adiciona testes de requisição para
o único seletor individual, salvamento de Vanilla sem alterar o tema global, e
rejeição de valores desconhecidos.

## Validação pendente

As alterações foram publicadas no GitHub, mas os testes automatizados e a
verificação visual ainda não foram executados nesta conexão. Executar `bluelab`
no host de teste, confirmar que o deploy termina e validar na interface:
1. aparece somente o seletor individual de tema na página Aparência da conta,
   inclusive para administradores;
2. selecionar Vanilla e salvar retorna normalmente à página, sem erro, e mantém
   Vanilla após recarregar;
3. a seleção individual não altera o tema global da instância;
4. a configuração global continua disponível em Administração > Aparência.

Não promover para `BlueLab` e não alterar a Espelunca sem aprovação explícita.

---

# Checkpoint adicional — identidade visual da instância em logos

Data: 2026-10-20 Canal autorizado: `BlueLab-Test`

## Escopo da alteração

-O layout de autenticação usa a logo carregada da instância (com fallback para
favicon da instância) e o nome configurado, inclusive nos fluxos em que antes
era mostrado o wordmark Mastodon. -O layout administrativo usa um cabeçalho de
instância consistente em desktop e mobile, incluindo preferências, administração
e moderação. -O helper `render_logo` deixa de apontar diretamente para a arte
estática do Mastodon. -A folha de estilos global injeta a logo da instância nas
variantes SVG de logo da aplicação sem alterar os tamanhos intrínsecos dos
elementos; a variável CSS usa a logo de autenticação ou o favicon como fallback.
-A estilização do cabeçalho usa a fonte de título do tema, respeita o nome
configurado e permite quebra de nomes longos para evitar transbordamento.

## Validação pendente

As alterações foram publicadas somente em `BlueLab-Test`. Não houve execução de
testes, build de assets ou verificação visual nesta conexão. Após executar
`bluelab` no host de teste, validar:
1. login, cadastro, recuperação de senha, confirmação de e-mail, autenticação de
   dois fatores e fluxo OAuth;
2. preferências de usuário, administração, denúncias e páginas de moderação em
   desktop e mobile;
3. logo personalizada carregada e fallback para favicon quando não houver logo
   de autenticação;
4. nomes de instância longos, contraste em temas claro/escuro e ausência de
   deslocamentos ou logos duplicadas.

Não promover para `BlueLab` nem alterar a Espelunca sem aprovação explícita.
