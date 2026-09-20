# Pipeline de atualização

O comando atual `bin/bluelab` possui uma verificação upstream em worktree, mas sua
rotina de alinhamento/deploy ainda altera uma árvore ativa e usa reset para igualar
um canal remoto. Ele não é o pipeline transacional requerido por esta iniciativa.

Nenhuma alteração foi feita nele nesta fase. A futura implementação será documentada
e testada antes de substituir qualquer interface existente.

Estado: planejado após inventário, mapa de acoplamento e definição de validações do
manifesto.
