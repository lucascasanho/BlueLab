# Checkpoint — atualização interrompida por fontes de domínios descartáveis

Data: 2026-10-20  
Canal autorizado: `BlueLab-Test`  
Instância: mastodon.blue / usuário local `blue`

## Falha observada

A execução de `bluelab` preservou as alterações locais no stash
`bluelab-reserva-local-blue-20261020-095545`, alinhou o checkout ao commit
`3c50eaf263`, instalou dependências Ruby e JavaScript e parou na etapa
`bin/tootctl email_domain_blocks sync_disposable`. Todas as fontes externas de
listas de domínios descartáveis retornaram HTTP 503.

O log não demonstra que migrations, assets e restart tenham sido concluídos nessa
execução. Não declarar o upgrade aplicado até a próxima execução terminar e os
healthchecks serem confirmados.

## Correção publicada

No commit `ee95150517bbd742f8bcb02556a5969ab335271d`, somente em
`BlueLab-Test`, `bin/bluelab` agora tenta sincronizar os domínios descartáveis
três vezes, com intervalo de cinco segundos. Se todas as fontes continuarem
indisponíveis, emite aviso explícito e continua o fluxo de atualização; não remove
nem altera os bloqueios já existentes. A sincronização será tentada novamente na
próxima execução.

Motivo: a sincronização depende de fontes HTTP externas e não deve impedir a
recuperação do serviço de teste quando todas estão temporariamente indisponíveis.
O aviso não significa que a lista foi atualizada.

## Retomada e validação pendentes

1. Executar novamente `bluelab` no host `blue`. O bootstrap deve atualizar o
   comando instalado a partir de `BlueLab-Test`.
2. Confirmar que migrations, precompilação de assets e restart terminam.
3. Confirmar `blue-web`, `blue-sidekiq` e `blue-streaming` ativos, healthcheck
   local e endpoint público HTTP 200.
4. Verificar a versão real via `lib/mastodon/version.rb` e o SHA implantado.
5. Conferir o stash de alterações locais; não aplicar nem descartar automaticamente
   até comparar com a árvore atual.
6. Não promover `BlueLab-Test` para `BlueLab` e não executar operações na
   Espelunca.

## Estado do teste

A alteração de código foi publicada no GitHub. Não foi possível executar Bash,
testes de integração ou deploy no host local por esta conexão; a correção ainda
precisa ser validada na execução real de `bluelab`.
