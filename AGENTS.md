# BlueLab workflow de desenvolvimento e promoção

Estas regras são obrigatórias para alterações feitas por assistentes, Codex ou automações neste repositório.

## Alvos e branches

- **Blue / mastodon.blue** é o alvo padrão de desenvolvimento e testes.
- **`BlueLab-Test`** é o canal cumulativo de testes do Blue.
- **`BlueLab`** é o canal estável consumido pela Espelunca através de `espelunca-atualizar`.
- A Espelunca não deve receber código ainda não aprovado em teste no Blue.

## Fluxo obrigatório

1. Todo novo ajuste solicitado deve ser implementado e publicado primeiro em **`BlueLab-Test`**.
2. Alterações de testes devem ser cumulativas: código novo não deve ficar apenas em branches temporárias. Se uma branch temporária for necessária para resolver um conflito ou preparar um patch, o resultado final deve entrar em `BlueLab-Test` antes de o usuário receber o comando de atualização do Blue.
3. O Blue deve conseguir receber todo o lote novo com um comando simples de atualização (`blue-atualizar`). O canal de teste pode conter frontend, backend, migrations, dependências, assets, configurações e demais alterações necessárias ao recurso solicitado.
4. Enquanto o usuário estiver testando ou informar que algo ainda não funciona, **`BlueLab` deve permanecer inalterada**. As correções seguintes continuam somente em `BlueLab-Test`.
5. Quando o usuário confirmar explicitamente que o teste funcionou — por exemplo, “funcionou”, “está certo”, “pode mandar para a Espelunca” ou equivalente — o assistente deve, na mesma interação, comparar `BlueLab` com `BlueLab-Test` e promover **todo o conjunto aprovado** para `BlueLab` por fast-forward quando isso for seguro.
6. A promoção para `BlueLab` deve apontar para o mesmo commit exato que foi testado no Blue. Não omitir commits do lote aprovado e não reconstruir a alteração com cherry-picks diferentes, salvo pedido explícito do usuário.
7. Após a promoção, a Espelunca deve conseguir receber o lote apenas executando `espelunca-atualizar`.
8. Se houver divergência entre `BlueLab` e `BlueLab-Test`, conflito inesperado ou impossibilidade de fast-forward, parar a promoção e diagnosticar. **Nunca** usar force-push, `reset --hard` ou outra operação destrutiva como atalho.
9. Por padrão, uma alteração aprovada no Blue é destinada também à Espelunca. Só manter uma alteração exclusivamente no Blue quando o usuário disser explicitamente que ela é “Blue-only”, “só para o Blue” ou equivalente.
10. Não modificar diretamente a instalação/working tree da Espelunca a menos que o usuário peça explicitamente. A promoção normal acontece somente pelo GitHub e depois pelo comando `espelunca-atualizar` executado pelo usuário.

## Regras para comandos entregues ao usuário

- Preferir comandos curtos e repetíveis em vez de sequências diferentes a cada ajuste.
- Para o Blue, o fluxo normal deve ser `blue-atualizar`.
- Para a Espelunca, depois de uma aprovação e promoção, o fluxo normal deve continuar sendo `espelunca-atualizar`.
- Não pedir que o usuário faça cherry-pick manual de commits que já podem ser publicados no canal correto pelo GitHub.
- Não exigir que o usuário troque de branch a cada ajuste; `BlueLab-Test` é o canal persistente de teste.

## Regra de segurança de promoção

Antes de mover `BlueLab`, confirmar que:

- `BlueLab-Test` contém o lote que o usuário acabou de testar;
- `BlueLab` é ancestral de `BlueLab-Test` ou existe uma estratégia não destrutiva claramente validada;
- a promoção não inclui alterações explicitamente rejeitadas pelo usuário;
- o commit promovido é exatamente o commit aprovado no Blue.
