# Progresso — sistema de atualização BlueLab

## Objetivo geral

Reduzir acoplamento do fork BlueLab ao Mastodon e construir atualização upstream
transacional, validada por manifesto, sem promoção ou acesso à Espelunca.

## Fase atual

Fases 0–2 concluídas e documentadas. A próxima unidade ainda não pode mover código:
deve primeiro confirmar o primeiro integration point B de baixo risco.

## Último checkpoint concluído

Proteção inicial verificada em 2026-09-20: branch `bluelab-teste`, HEAD
`8300c26ed840eec984932a55a2a027392b98e96c`, árvore limpa; branch local de recuperação
`backup/bluelab-before-update-system-20260920` criada no mesmo SHA. O upstream foi
buscado sem alterar a árvore de trabalho. Inventário e mapa foram consolidados no
commit `9efd38d7e8`.

## Último commit criado

`9efd38d7e8 bluelab-update: inventory existing customizations`.

## Arquivos já migrados

Nenhum. Esta etapa não move nem refatora código.

## Arquivos pendentes

Nenhum código está pendente de migração nesta fase. As migrações funcionais só podem
começar após a revisão do checkpoint documental.

## Problemas encontrados

- O fork possui 1.188 commits próprios desde o ancestral comum; diferença Git não é
  sinônimo de funcionalidade BlueLab.
- `bin/bluelab` atual inclui operações de árvore ativa e reset; não deve ser usado
  como base transacional sem refatoração posterior.
- Há um worktree prunable histórico em `/tmp/bluelab-pr106`; não foi alterado.

## Decisões arquiteturais

- Inventariar por domínio funcional e evidência, usando `bluelab/manifest.yml` como
  catálogo operacional; não mover código durante fases 0–2.
- Tratar AUTH/SECURITY/DATABASE como revisão semântica obrigatória.
- Preservar módulos já isolados e reduzir primeiro pontos B, sem copiar arquivos
  upstream inteiros.

## Testes executados

- `git status --short --branch` inicial: limpo.
- `git fetch upstream --tags --prune`: concluído.
- `git merge-base HEAD upstream/main`: `c9b78c464b99f6c0b6b28e2f6b174a9ef0faa55f`.
- Inventário de diff: 789 caminhos (379 A, 410 M); 16 domínios de produto registrados.
- YAML do manifesto carregado por Ruby/Psych e todos os caminhos de testes declarados
  foram confirmados no checkout.
- `git diff --check`: passou.

## Testes pendentes

Não há mudança funcional a testar nesta unidade. A primeira validação funcional será
definida junto ao primeiro domínio escolhido para isolamento.

## Próximo passo exato

Ler os módulos e testes da entrada `blue2-shell-navigation`, identificar um único
integration point B de baixo risco e registrar a decisão antes de mover qualquer
arquivo. Começar por `app/javascript/mastodon/features/blue2/` e seus consumidores
em `features/ui/` e `features/navigation_panel/`.

## Comandos para continuar

```bash
cd /home/blue/blue
git status --short --branch
sed -n '1,240p' docs/bluelab-update-system/PROGRESS.md
git diff -- docs/bluelab-update-system bluelab/manifest.yml CODEX_PROGRESS.md
rg -n "blue2|BlueLab" app/javascript/mastodon/features/{blue2,ui,navigation_panel}
```

## Estado da árvore Git

Após o commit de registro deste checkpoint, a árvore deve estar limpa e
`bluelab-teste` deve ficar dois commits à frente de `bluelab/bluelab-teste`. Confirmar
o estado real com `git status` antes de agir.
