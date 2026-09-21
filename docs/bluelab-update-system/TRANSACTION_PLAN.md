# Plano de execução transacional em worktree

## Objetivo e limite

Esta etapa define a simulação de uma atualização upstream sem modificar a árvore ativa,
branches remotas, serviços, banco ou instalações. Ela é uma pré-condição para qualquer
futuro comando de integração; não substitui `bin/bluelab` nem executa deploy.

## Entradas obrigatórias

- checkout limpo do BlueLab;
- SHA remoto atual de `BlueLab-Test`;
- ref upstream escolhida explicitamente (tag ou `upstream/main`);
- `bluelab/manifest.yml` aprovado por `bin/bluelab-manifest-validate`;
- diretório de estado exclusivo para a execução.

O comando deve recusar refs ausentes, árvore ativa suja, manifesto inválido ou um
diretório de estado que já contenha uma execução em curso. Não deve inferir uma ref
upstream pela versão declarada sem registrá-la no relatório.

## Sequência proposta

1. Fazer fetch somente das refs necessárias e registrar os SHAs de teste e upstream.
2. Criar um worktree destacável temporário no SHA de `BlueLab-Test`, fora do checkout
   ativo, com `mktemp -d` e limpeza garantida por `trap`.
3. Executar no worktree `git merge --no-commit --no-ff <ref-upstream>`; nunca usar
   `reset`, `checkout --`, `clean` ou merge driver automático para resolver conflitos.
4. Gerar o conjunto de caminhos alterados e associar cada um às entradas do manifesto
   por prefixo de arquivo declarado. Caminhos não associados são `UNCLASSIFIED`.
5. Se houver conflitos, abortar somente o merge do worktree, classificar os caminhos e
   produzir o relatório `NEEDS_SEMANTIC_REVIEW`; não criar commit.
6. Sem conflitos, executar gates somente de leitura no worktree: `git diff --check`,
   validador do manifesto e presença dos testes declarados. O plano não aprova nem
   executa automaticamente suites Ruby/JavaScript ainda.
7. Remover o worktree temporário, preservando somente o relatório imutável no diretório
   de estado. A árvore ativa deve permanecer no mesmo SHA e limpa.

## Gates e resultado

| Situação                                         | Resultado                | Efeito permitido                      |
| ------------------------------------------------ | ------------------------ | ------------------------------------- |
| Manifesto inválido, checkout sujo ou ref ausente | `PRECONDITION_FAILED`    | nenhum worktree ou branch alterado    |
| Conflito, caminho `UNCLASSIFIED` ou domínio D    | `NEEDS_SEMANTIC_REVIEW`  | relatório; nenhum commit/deploy       |
| Diferença inválida ou teste declarado ausente    | `VALIDATION_FAILED`      | relatório; nenhum commit/deploy       |
| Merge textual e gates estruturais passam         | `READY_FOR_HUMAN_REVIEW` | relatório; integração humana separada |

Domínios com isolamento `D`, ou categorias AUTH, SECURITY, DATABASE, MIGRATION,
PASSKEY e UPLOAD, são sempre `NEEDS_SEMANTIC_REVIEW`, mesmo sem conflito textual.

## Relatório persistido

Cada execução deve gravar um único JSON em
`$BLUELAB_STATE_DIR/transactions/<id>.json` com no mínimo:

```json
{
  "id": "UTC-UUID",
  "status": "READY_FOR_HUMAN_REVIEW",
  "test_sha": "...",
  "upstream_ref": "upstream/main",
  "upstream_sha": "...",
  "manifest_sha": "...",
  "changed_paths": [],
  "conflicts": [],
  "domains": [],
  "commands": [],
  "started_at": "ISO-8601",
  "finished_at": "ISO-8601"
}
```

O relatório não contém segredos, configurações administrativas, conteúdo de `.env` ou
saída completa de comandos. Cada caminho deve conter sua classe (`A`–`D`) e a razão de
gate quando houver bloqueio.

## Critérios de aceite do protótipo

- uma execução de sucesso não modifica `HEAD`, index, working tree ou refs remotas;
- um conflito deixa a árvore ativa limpa e remove o worktree temporário;
- um caminho de domínio D impede o estado pronto para revisão;
- um caminho não catalogado é informado e impede a continuação;
- o relatório aponta os SHAs exatos, é legível por máquina e não contém segredos;
- testes usam um repositório Git temporário local, sem rede, banco ou serviços.

## Próximo passo

Implementar um comando novo, somente de simulação, seguindo este contrato e cobri-lo
com testes de repositório temporário. `bin/bluelab` continua inalterado até que esse
protótipo seja validado no Blue.
