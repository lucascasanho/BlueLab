# Alteração segura de nome de usuário

Esta customização permite que uma conta local elegível altere o próprio
`username` sem criar outra conta ou executar uma migração de conta.

## Arquitetura e banco

`account_username_reservations` é a fonte persistente de nomes atuais e
anteriores. Cada nome é único sem diferenciar maiúsculas e minúsculas. O nome
atual possui `relinquished_at = NULL`; nomes anteriores registram o instante em
que deixaram de ser atuais. A migration preenche a tabela com todas as contas
locais existentes. Se uma conta for removida fisicamente, a reserva permanece
com `account_id = NULL`, impedindo impersonação futura.

O rollback da migration só remove a tabela enquanto ainda não houver nenhum
nome histórico. Depois da primeira alteração, o `down` é deliberadamente
irreversível para não apagar reservas de identidade.

`AccountUsernameChangeService` autentica a senha pelo Devise, verifica a
elegibilidade e executa reserva, histórico, alteração do `Account` e auditoria
na mesma transação. Constraints únicas do PostgreSQL são a proteção final
contra corridas. Novas contas reservam o username no callback de criação.

## Identidade e federação

Somente contas `numeric_ap_id` podem usar o recurso. O Actor ID, ID interno,
chaves, posts e associações não são alterados. Após o commit,
`ActivityPub::UpdateDistributionWorker` envia um `Update` do mesmo ator com o
novo `preferredUsername` e WebFinger.

Contas `username_ap_id`, remotas, inativas, suspensas, memoriais, migradas,
automatizadas ou sem senha local são recusadas.

## Cooldown e rollback

A última reserva marcada como anterior determina o início do cooldown de 15
dias. Durante o período, somente o username imediatamente anterior pode ser
reativado. Um rollback não apaga histórico e inicia outro cooldown de 15 dias.
Depois do prazo, qualquer nome livre ou anteriormente reservado à própria
conta pode ser escolhido.

## Aliases, WebFinger e URLs

WebFinger aceita um username anterior e responde com o subject atual e o mesmo
Actor ID numérico. A URL HTML `/@nome-anterior` redireciona permanentemente
para o perfil canônico atual. Reservas sem conta bloqueiam reutilização, mas
não redirecionam.

Caches globais não são limpos. As chaves de menções do username antigo e do
novo são invalidadas apenas para os domínios locais, e a resolução local de
menções reconhece aliases. A atualização do registro altera sua cache key, e
os endpoints públicos usam TTL próprio. Servidores remotos podem manter o
handle anterior temporariamente até receberem o `Update` ou expirarem caches.

## Pontos de integração

- `AccountUsernameChangeService`: regras e transação central.
- `AccountUsernameReservation`: reserva e histórico.
- `Settings::UsernameChangesController`: endpoint autenticado dedicado.
- `WebfingerResource` e `AccountOwnedConcern`: resolução de aliases antigos.
- `ActivityPub::UpdateDistributionWorker`: distribuição federada nativa.
- `Admin::ActionLog`: auditoria sem senha, token ou segredo.
