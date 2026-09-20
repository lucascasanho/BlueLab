# Arquitetura de atualizações BlueLab

## Escopo e fonte de verdade

Esta documentação descreve a refatoração incremental do fork BlueLab. O alvo desta
etapa é apenas o canal de teste `bluelab-teste` no laboratório Blue. A branch
`bluelab`, qualquer instalação de produção e a Espelunca estão explicitamente fora
do escopo.

O código fonte de verdade é o Git local e os remotes configurados. Em 2026-09-20 o
ancestral comum confirmado entre `bluelab-teste` e `upstream/main` é
`c9b78c464b99f6c0b6b28e2f6b174a9ef0faa55f` (`v4.7.0-beta.1-278-gc9b78c464b`).
Isso fornece um limite mecânico para a auditoria, mas uma diferença nesse intervalo
não prova sozinha que seja uma customização intencional: cada entrada do manifesto
precisa de evidência funcional, histórico ou teste.

## Direção arquitetural

1. Implementação BlueLab vive em módulos próprios quando a API interna do Mastodon
   permitir; módulos existentes já separados devem ser preservados e melhor
   documentados antes de serem movidos.
2. Arquivos upstream só contêm um ponto de integração pequeno, localizável e com a
   menor lógica possível. Um ponto futuro deverá usar o marcador
   `BLUELAB_INTEGRATION` quando isso respeitar o estilo do arquivo.
3. Autenticação, autorização, passkeys, segurança, uploads, schema e migrations
   são zonas de reconciliação semântica: não recebem resolução automática cega.
4. Uma atualização upstream é preparada em worktree descartável; a árvore ativa
   não é alterada até que validações e preservação de funcionalidades passem.

## Estado inicial observado

- Branch: `bluelab-teste`, HEAD `8300c26ed840eec984932a55a2a027392b98e96c`.
- Árvore de trabalho: limpa antes da documentação desta iniciativa.
- Recuperação local criada antes de qualquer edição:
  `backup/bluelab-before-update-system-20260920` no mesmo SHA. Nenhuma referência
  remota foi alterada.
- Remotes Mastodon: `upstream` e `mastodon-oficial`; ambos apontam para o projeto
  oficial. `upstream/main` foi buscado em 2026-09-20 e está em `398b542652`.
- Há worktrees históricos, inclusive um worktree prunable em `/tmp`; eles não fazem
  parte desta refatoração e não serão limpos automaticamente.

## Limites desta fase

Fases 0, 1 e 2 criam proteção, inventário e mapa de acoplamento. Nenhuma
funcionalidade será movida, removida ou reescrita antes de o inventário estar
revisado e commitado.
