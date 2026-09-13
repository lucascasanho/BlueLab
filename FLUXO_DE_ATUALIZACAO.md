# Fluxo de atualização do BlueLab

Os canais oficiais de implantação são:

- `bluelab`: estado estável. É o único canal consultado pela Espelunca.
- `bluelab-teste`: estado destinado a testes no mastodon.blue.

O Mastodon oficial é uma fonte de atualizações, não uma substituição do BlueLab. Atualizações upstream devem preservar as customizações, limites, paletas, controles do painel administrativo, tema BlueLab, navegação e compose.

A promoção deve levar para `bluelab` exatamente o SHA que foi implantado e testado em `bluelab-teste`. Se o canal de teste mudar depois da implantação, a promoção deve ser recusada até que o novo SHA seja testado.

A verificação do Mastodon oficial deve ser feita de forma não destrutiva. Se uma nova versão oficial gerar conflitos, nenhum canal deve ser alterado e o relatório deve listar os arquivos conflitantes por área para facilitar a correção assistida.

Os canais antigos `BlueLab`, `BlueLab-Test` e `BlueLab-Testing` existem apenas durante a migração do atualizador instalado nas instâncias e não fazem parte do fluxo definitivo.

## Fontes técnicas

- Projeto Mastodon oficial: https://github.com/mastodon/mastodon
- Documentação do Git sobre merge: https://git-scm.com/docs/git-merge
- Documentação do Git sobre worktree: https://git-scm.com/docs/git-worktree
