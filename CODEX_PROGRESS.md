# Continuidade operacional do Codex

> Este arquivo registra o estado retomável da tarefa mais recente. Ele não substitui o
> `AGENTS.md`, a documentação permanente, o Git nem a verificação do estado real do sistema.
> Nunca registrar segredos aqui.

## Estado

- Status: implementação e validações concluídas; publicação no Blue pendente
- Atualizado em: 2026-09-09 — America/Cuiaba
- Objetivo: minimizar o compose BlueLab ao clicar fora e persistir o rascunho localmente entre navegação, reload e fechamento do site/PWA até publicação, descarte ou remoção do conteúdo.
- Alvo: somente `BlueLab-Test`/mastodon.blue para teste; `BlueLab` e Espelunca permanecem inalterados até aprovação explícita.

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
- O usuário aprovou o lote cumulativo e autorizou sua promoção e implantação na Espelunca.
- Pré-promoção confirmada: working tree limpo; `BlueLab` (`e61da25a9c`) era ancestral de `BlueLab-Test` (`200854bb9b`), com quatro commits à frente e nenhuma divergência.
- `BlueLab` foi promovida por fast-forward para o mesmo commit `200854bb9b`; `BlueLab` e `BlueLab-Test` no GitHub apontam exatamente para esse commit.
- Antes da atualização, a Espelunca estava limpa, saudável e no commit estável anterior `e61da25a9c`.
- Backup PostgreSQL concluído em `/home/espelunca/espelunca-backups/espelunca-20260909-004244-e61da25a9cfb.dump` (105 MB).
- Espelunca sincronizada e implantada no commit aprovado `200854bb9b`; dependências, assets, migrations pré/pós-deploy e reinícios concluíram sem falha.
- O aviso de health local emitido imediatamente após o restart foi transitório: na repetição, Rails e nginx retornaram HTTP 200; home e API públicas também retornaram HTTP 200.
- Espelunca ficou com working tree limpo; web, Sidekiq, streaming e nginx ativos; banco sem migrations pendentes e sem novos erros nos logs da janela do deploy.
- A página pública injeta `--blue2-blue: #b5128a`, e o bundle público contém o botão de envio com `variant: solid`, `color: accent` e `type: submit`.
- Nova tarefa iniciada com branch `BlueLab-Test`, HEAD `8bfa72d6f5` e working tree limpo; `BlueLab` e `BlueLab-Test` estavam alinhadas.
- Auditoria confirmou que a navegação SPA já preserva o Redux em memória, mas reload/fechamento perde o rascunho; não há persistência de draft existente.
- O fundo escuro do modal BlueLab é hoje uma sombra extensa do formulário, sem elemento clicável; será adicionado um backdrop somente no tema BlueLab, ligado à ação existente de minimizar.
- Persistência planejada: `localStorage` versionado e separado por ID da conta/origin, whitelist de campos coerentes do compose, restauração minimizada e remoção em reset/publicação/descarte ou quando todo conteúdo significativo for apagado.
- Backdrop transparente implementado somente no modal do tema BlueLab; ele intercepta o clique externo e despacha a mesma ação usada pelo botão de minimizar, sem alterar menus/popovers acima do modal.
- Persistência implementada na inicialização pós-hidratação: grava imediatamente por mudança do compose, restaura o draft minimizado e elimina `File` local não serializável mantendo metadados de anexos já enviados.
- Leitura local valida versão, tipos, enquete e IDs de mídia antes de restaurar; conteúdo corrompido/incompatível é ignorado.
- Foram adicionados testes para clique no backdrop, restauração coerente e minimizada, gravação imediata, reset/descarte, publicação, apagamento total, isolamento entre contas e ausência de efeito no composer Mastodon regular.
- ESLint focado, Stylelint focado, TypeScript, 12 testes focados e build Vite de produção passaram; apenas os avisos preexistentes do futuro `configLoader: native` do Vite foram emitidos.

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
- [x] Confirmar aprovação, ancestralidade e conteúdo cumulativo do lote.
- [x] Promover `BlueLab` por fast-forward para o commit exato testado.
- [x] Executar `espelunca-atualizar` e acompanhar backup, dependências, migrations, assets e restart.
- [x] Validar commit, working tree, serviços, health, API, paleta e bundle público na Espelunca.
- [x] Auditar modal, ações de minimizar/descartar, reducer do compose, hidratação e armazenamento existentes.
- [x] Implementar backdrop clicável reutilizando `minimizeComposerToggle`.
- [x] Implementar persistência/restauração por conta sem afetar a branch estável.
- [x] Adicionar testes automatizados de persistência, isolamento, limpeza e restauração minimizada.
- [x] Executar lint, tipos, testes focados e build de produção.
- [ ] Publicar em `BlueLab-Test`, atualizar somente mastodon.blue e validar o deploy.

## Decisões e cuidados

- O usuário aprovou a promoção do lote cumulativo, incluindo a correção de links verificados e o botão “Publicar” pela paleta.
- A correção usa os tokens semânticos de sucesso; no Blue eles seguem o azul e, em futura promoção aprovada, na Espelunca seguirão o rosa.
- O sistema novo de selo por cargo/instância não será alterado.
- A alteração do botão é feita pela API já existente do componente, sem seletor CSS adicional; por isso acompanha qualquer paleta de instância após futura promoção.
- A persistência deve preservar texto, CW, visibilidade, idioma, formato, contexto de resposta/edição/citação, enquete e metadados de anexos já enviados; `File` local e upload ainda em andamento não são recuperáveis após fechamento.
- O draft deve ser isolado por conta para não aparecer ao trocar de usuário no mesmo domínio; o origin do navegador já separa instâncias diferentes.
- Nenhuma expiração automática será usada, conforme o pedido de manter o conteúdo até ação do usuário.
- Não usar force-push, reset destrutivo ou reconstrução por cherry-pick.

## Próximo passo seguro

Implementar o patch mínimo, validar e implantar somente no mastodon.blue. Aguardar aprovação antes de qualquer promoção ou atualização da Espelunca.
