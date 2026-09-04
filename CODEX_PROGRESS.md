# Continuidade operacional do Codex

> Este arquivo registra o estado retomável da tarefa mais recente. Ele não substitui o
> `AGENTS.md`, a documentação permanente, o Git nem a verificação do estado real do sistema.
> Nunca registrar segredos aqui.

## Estado

- Status: concluído
- Atualizado em: 2026-08-31 — America/Cuiaba
- Objetivo: implementar a política permanente de continuidade e recuperação de tarefas do BlueLab.
- Alvo: Blue / repositório BlueLab
- Escopo autorizado: organizar a regra aplicável, criar este checkpoint e sincronizar a mudança com o GitHub.

## Plano atual

- [x] Consultar o mecanismo oficial de longa duração e retomada do Codex.
- [x] Ler o `AGENTS.md` aplicável e confirmar que já havia uma política resumida, evitando duplicá-la.
- [x] Consolidar a política existente com os requisitos detalhados de recuperação segura.
- [x] Criar `CODEX_PROGRESS.md` como checkpoint canônico do projeto.
- [x] Validar o conteúdo e reconciliá-lo com o Git.
- [x] Criar commit e sincronizar com o GitHub.
- [x] Marcar este checkpoint como concluído e remover pendências obsoletas.

## Estado do Git no início

- Branch: `codex/20260830-modernize-composer-profile`
- HEAD inicial: `57bc92110d20cd0bb8705ac8f1014a5ea0606c76`
- Upstream inicial: `origin/codex/20260830-modernize-composer-profile`
- Alterações preexistentes: nenhuma; o worktree estava limpo.

## Alterações realizadas

- O capítulo de continuidade do `/home/blue/AGENTS.md` foi ampliado no mesmo local, preservando as políticas existentes de Blue e Espelunca.
- Este arquivo foi criado como fonte operacional canônica de checkpoint para o projeto.
- O checkpoint genérico anterior foi desativado para não manter duas fontes de verdade.

## Operações e validações

- Documentação oficial consultada: `https://learn.chatgpt.com/docs/long-running-work`.
- A documentação confirma o modo Goal como mecanismo oficial para objetivos duráveis, com controles de pausa e retomada no mesmo chat.
- Não há garantia documentada de retomada automática exatamente após a restauração de uma cota; nenhuma automação frágil será criada para simular isso.
- A política contém um único capítulo de continuidade; não restaram referências ao checkpoint genérico anterior.
- `git diff --check` foi executado sem erros.

## Decisões técnicas

- Manter checkpoints por marcos, não por comandos triviais, para preservar informação útil sem gerar ruído.
- Tratar Git, arquivos, banco e serviços como fontes de verdade; o checkpoint serve para orientar a reconciliação.
- Manter a política permanente no `AGENTS.md` e apenas o estado operacional neste arquivo.

## Problemas encontrados

- Nenhum até este ponto.

## Alterações ainda não commitadas

- Nenhuma alteração funcional pendente.
- Esta atualização de encerramento do checkpoint será registrada no commit final da tarefa.

## Resultado final conhecido

- Commit da política: `f88f612a0a` (`docs: add Codex continuity checkpoint`).
- O commit da política foi enviado para `origin/codex/20260830-modernize-composer-profile`.
- `/home/blue/AGENTS.md` contém a regra permanente aplicável ao workspace.
- `CODEX_PROGRESS.md` é o checkpoint canônico deste projeto.
- Não há itens operacionais pendentes.

## Próximo passo seguro

Ao iniciar a próxima tarefa longa ou com várias etapas, conferir o Git e substituir o estado desta tarefa pelo novo objetivo, preservando somente informações ainda relevantes.

## Cuidados para retomada

- Ler `/home/blue/AGENTS.md` e este arquivo antes de continuar.
- Confirmar o estado real com `git status`, diff e commits recentes.
- Confirmar no remoto o commit registrado antes de repetir qualquer sincronização.
