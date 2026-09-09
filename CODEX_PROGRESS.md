# Continuidade operacional do Codex

> Este arquivo registra o estado retomável da tarefa mais recente. Ele não substitui o
> `AGENTS.md`, a documentação permanente, o Git nem a verificação do estado real do sistema.
> Nunca registrar segredos aqui.

## Estado

- Status: em andamento
- Atualizado em: 2026-09-08 — America/Cuiaba
- Objetivo: promover o ajuste aprovado de Preferências para a Espelunca e corrigir somente no Blue a regressão visual dos links verificados.
- Alvos: `BlueLab`/espelunca.social para o lote aprovado; `BlueLab-Test`/mastodon.blue para a nova correção ainda não aprovada.

## Estado confirmado

- Branch de trabalho: `BlueLab-Test`.
- HEAD inicial desta etapa: `e61da25a9cfb38d3c743997a54f1ad4f2d604c50`.
- Working tree inicial: limpo.
- O ajuste aprovado de Preferências foi promovido por fast-forward; `BlueLab` e `BlueLab-Test` passaram a apontar para `e61da25a9c`.
- Espelunca atualizada para `e61da25a9c` após backup de 105 MB; o lote promovido continha somente o CSS das Preferências e este checkpoint.
- Serviços web, Sidekiq, streaming e nginx da Espelunca ficaram ativos; banco sem migrations pendentes e API pública HTTP 200.
- A regressão dos links verificados foi localizada no cartão novo de campos do perfil: fundo “softest” quase preto no tema escuro do Blue e conteúdo herdando a cor comum.
- A correção local usa fundo de sucesso mais visível e fixa nome, valor, link e SVG oficial em `--color-text-success`; campos comuns permanecem inalterados.
- Stylelint, formatação, build de produção e prova visual/computada passaram para Blue e Espelunca em claro e escuro.

## Plano atual

- [x] Promover o ajuste aprovado de Preferências e atualizar a Espelunca.
- [x] Confirmar que a promoção não contém mudanças em links verificados.
- [x] Localizar a causa visual específica do Blue.
- [x] Restaurar fundo, conteúdo e SVG legado na cor semântica de destaque.
- [ ] Validar, publicar somente em `BlueLab-Test` e atualizar mastodon.blue.
- [ ] Confirmar que `BlueLab` e Espelunca não receberam a correção ainda não aprovada.

## Decisões e cuidados

- A correção de links verificados não será promovida para `BlueLab` nem enviada à Espelunca sem novo teste e aprovação explícita do usuário.
- A correção usa os tokens semânticos de sucesso; no Blue eles seguem o azul e, em futura promoção aprovada, na Espelunca seguirão o rosa.
- O sistema novo de selo por cargo/instância não será alterado.
- Não usar force-push, reset destrutivo ou reconstrução por cherry-pick.

## Próximo passo seguro

Validar a correção dos campos verificados em claro/escuro, criar o commit de teste e publicar somente no mastodon.blue.
