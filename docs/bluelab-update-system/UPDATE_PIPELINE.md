# Pipeline de atualização

O comando atual `bin/bluelab` possui uma verificação upstream em worktree, mas sua
rotina de alinhamento/deploy ainda altera uma árvore ativa e usa reset para igualar
um canal remoto. Ele não é o pipeline transacional requerido por esta iniciativa.

O primeiro pré-requisito executável foi adicionado sem alterar `bin/bluelab`:
`bin/bluelab-manifest-validate` carrega `bluelab/manifest.yml` com YAML seguro e
confere versão, inventário, contagens, IDs únicos, níveis de isolamento e os caminhos
de arquivos/testes declarados. O teste isolado
`test/bluelab_manifest_validator_test.rb` cobre o manifesto atual, IDs duplicados e
caminhos fora do repositório.

Estado: a validação do manifesto está pronta. A próxima etapa é definir o plano de
execução transacional em worktree e seu relatório, ainda sem substituir a interface
de atualização existente. O contrato foi registrado em
`docs/bluelab-update-system/TRANSACTION_PLAN.md`; o próximo incremento é um comando
novo, somente de simulação, testado contra repositórios temporários locais.
