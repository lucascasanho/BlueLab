# Continuidade operacional do Codex

> Este arquivo registra o estado retomável da tarefa mais recente. Ele não substitui o
> `AGENTS.md`, a documentação permanente, o Git nem a verificação do estado real do sistema.
> Nunca registrar segredos aqui.

## Estado

- Status: aguardando teste do usuário
- Atualizado em: 2026-09-08 — America/Cuiaba
- Objetivo: promover o lote aprovado de cores de sucesso/links verificados para a Espelunca e ajustar somente no Blue as linhas grossas dos cabeçalhos das Preferências em modo claro.
- Alvos: `BlueLab`/espelunca.social para o lote já aprovado; `BlueLab-Test`/mastodon.blue para o novo ajuste ainda não aprovado.

## Estado confirmado

- Branch de trabalho: `BlueLab-Test`.
- HEAD inicial desta etapa: `ebc55e8eef57e202679a30b80ef20e6d2964d0ae`.
- Working tree inicial: limpo.
- `BlueLab` era ancestral direto de `BlueLab-Test`.
- Lote aprovado: `60674b521c` e `ebc55e8eef`, somente em `icon_verified.svg` e `blue-2-v12.scss`.
- `BlueLab` foi promovida por fast-forward ao commit exato `ebc55e8eef`.
- Espelunca atualizada para `ebc55e8eef`; backup de 105 MB criado antes do cutover.
- Serviços web, Sidekiq, streaming e nginx ativos; banco sem migrations pendentes; saúde local e API pública HTTP 200.
- Ajuste de Preferências publicado em `BlueLab-Test` no commit `84ab011af1` e implantado somente no mastodon.blue.
- O CSS publicado foi confirmado por HTTP; health local e API pública do Blue responderam HTTP 200, sem erros novos nos serviços.
- Espelunca permanece limpa no commit estável `ebc55e8eef`, com todos os serviços ativos.

## Plano atual

- [x] Validar limpeza, conteúdo e ancestralidade antes da promoção.
- [x] Promover `BlueLab` ao commit aprovado exato `ebc55e8eef`.
- [x] Atualizar e validar espelunca.social a partir de `BlueLab`.
- [x] Reproduzir e localizar as linhas grossas no topo das Preferências em modo claro.
- [x] Aplicar o menor ajuste possível somente em `BlueLab-Test`.
- [x] Executar lint/build e validação visual claro/escuro.
- [x] Publicar e atualizar somente mastodon.blue.
- [x] Confirmar que Espelunca permanece no lote aprovado, sem o novo ajuste.

## Decisões e cuidados

- A nova alteração de Preferências não será promovida para `BlueLab` sem novo teste e aprovação explícita do usuário.
- A Espelunca deve consumir somente o commit estável promovido pelo GitHub.
- Não usar force-push, reset destrutivo ou reconstrução por cherry-pick.

## Próximo passo seguro

Aguardar o teste do usuário no mastodon.blue. Só promover o ajuste de Preferências para `BlueLab` e Espelunca após aprovação explícita.
