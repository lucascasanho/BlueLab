# Continuidade operacional do Codex

> Este arquivo registra o estado retomável da tarefa mais recente. Ele não substitui o
> `AGENTS.md`, a documentação permanente, o Git nem a verificação do estado real do sistema.
> Nunca registrar segredos aqui.

## Estado

- Status: concluído no Blue; aguardando teste do usuário
- Atualizado em: 2026-09-09 — America/Cuiaba
- Objetivo: fazer o botão “Publicar” do composer BlueLab seguir a paleta de cores da instância, preservando cumulativamente a correção de links verificados ainda em teste.
- Alvo: somente `BlueLab-Test`/mastodon.blue; `BlueLab` e Espelunca devem permanecer inalterados até aprovação explícita.

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
- Correção publicada em `BlueLab-Test` no commit `341fe87f75` e implantada somente no mastodon.blue.
- Asset público da correção confirmado por HTTP; serviços do Blue ativos, health local e API pública HTTP 200, sem novos erros.
- `BlueLab` e Espelunca permanecem limpos em `e61da25a9c`, sem a correção ainda não aprovada.
- Nova tarefa iniciada com `BlueLab-Test` limpo em `d0ec6dc858`.
- Causa do botão localizada no novo composer: o `Button` de envio usava `variant='solid'`, mas mantinha a cor padrão `neutral`, que usa a superfície invertida em vez da paleta.
- Ajuste mínimo aplicado: `color='accent'` no botão de envio; o componente passa a consumir `--color-bg-brand-base`, já mapeado para `--blue2-blue` e injetado pela configuração da instância.
- Formatação focada, ESLint focado, TypeScript e build Vite de produção passaram; o build exibiu somente os avisos preexistentes sobre o futuro `configLoader: native` do Vite.
- Alteração funcional publicada em `BlueLab-Test` no commit `efcedcb95b` e implantada somente no mastodon.blue com `blue-atualizar`.
- O bundle público HTTP 200 contém `variant: solid`, `color: accent` e `type: submit` no botão; a página pública injeta `--blue2-blue: #4054ff`.
- Web, Sidekiq, streaming e nginx do Blue estão ativos; health local e API pública retornam HTTP 200; não apareceram novos erros nos logs da janela do deploy.
- `BlueLab` permanece inalterada em `e61da25a9c`; nenhuma operação foi executada na Espelunca.

## Plano atual

- [x] Promover o ajuste aprovado de Preferências e atualizar a Espelunca.
- [x] Confirmar que a promoção não contém mudanças em links verificados.
- [x] Localizar a causa visual específica do Blue.
- [x] Restaurar fundo, conteúdo e SVG legado na cor semântica de destaque.
- [x] Validar, publicar somente em `BlueLab-Test` e atualizar mastodon.blue.
- [x] Confirmar que `BlueLab` e Espelunca não receberam a correção ainda não aprovada.
- [x] Identificar o botão de envio real, sem confundi-lo com o botão lateral que abre o composer.
- [x] Aplicar a cor semântica de destaque ao botão de envio.
- [x] Executar validações focadas e build de produção.
- [x] Publicar em `BlueLab-Test` e atualizar somente mastodon.blue.
- [x] Validar serviços, endpoints e asset público; confirmar novamente que a branch estável não mudou e que a Espelunca não foi acessada.

## Decisões e cuidados

- A correção de links verificados não será promovida para `BlueLab` nem enviada à Espelunca sem novo teste e aprovação explícita do usuário.
- A correção usa os tokens semânticos de sucesso; no Blue eles seguem o azul e, em futura promoção aprovada, na Espelunca seguirão o rosa.
- O sistema novo de selo por cargo/instância não será alterado.
- A alteração do botão é feita pela API já existente do componente, sem seletor CSS adicional; por isso acompanha qualquer paleta de instância após futura promoção.
- Não usar force-push, reset destrutivo ou reconstrução por cherry-pick.

## Próximo passo seguro

Aguardar o teste do usuário no botão “Publicar” do composer em mastodon.blue. Só promover o lote cumulativo para `BlueLab` após aprovação explícita.
