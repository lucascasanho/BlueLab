# BlueLab workflow de desenvolvimento e promoção

Estas regras são obrigatórias para alterações feitas por assistentes, Codex ou automações neste repositório.

## Alvos e branches

- **Blue / mastodon.blue** é o alvo padrão de desenvolvimento e testes.
- **`BlueLab-Test`** é o canal oficial cumulativo de testes do Blue.
- **`BlueLab`** é o canal oficial estável consumido pela Espelunca.
- As branches legadas **`bluelab`** e **`bluelab-teste`** não fazem parte do pipeline oficial e não devem ser usadas em novos procedimentos.

## Comando operacional único

O comando operacional de atualização é sempre:

```bash
bluelab
```

Não usar nem recomendar `blue-atualizar` ou `espelunca-atualizar` para o fluxo normal.

O comando `bluelab` detecta automaticamente se está no Blue ou na Espelunca:

- No **Blue**, usa `BlueLab-Test`.
- Na **Espelunca**, usa `BlueLab`.

Os comandos auxiliares também são invocados pelo mesmo programa:

```bash
bluelab estado
bluelab promover
bluelab verificar-mastodon
```

## Fluxo oficial

```
BlueLab-Test
    ↓
mastodon.blue
    ↓
testes e validação
    ↓
bluelab promover
    ↓
BlueLab
    ↓
Espelunca
```

Todo código de aplicação destinado à produção deve ser testado primeiro no Blue.

Enquanto uma alteração estiver sendo testada ou ainda não estiver aprovada, `BlueLab` deve permanecer inalterada.

Quando o usuário confirmar explicitamente que o lote foi aprovado para produção, `bluelab promover` deve promover o mesmo SHA efetivamente testado no Blue para `BlueLab`.

A promoção deve continuar protegida contra:

- checkout local diferente de `BlueLab-Test`;
- SHA não registrado como implantado/testado;
- divergência entre os canais;
- alterações locais não preservadas.

Nunca usar force-push, reset destrutivo ou cherry-pick manual para contornar essas proteções.

## Mastodon oficial

O repositório upstream oficial é:

`https://github.com/mastodon/mastodon`

Somente o **Blue** verifica automaticamente se existe candidato upstream mais novo.

No Blue, `bluelab` pode:

1. consultar `mastodon/mastodon`;
2. detectar uma versão upstream mais nova;
3. simular a integração e detectar conflitos;
4. gerar informações para a reconciliação.

Essa verificação não significa aplicação automática do upstream.

A **Espelunca não deve consultar nem integrar diretamente o upstream**. Ela recebe somente a versão promovida para `BlueLab`.

## Atualização da Espelunca

Na Espelunca, o único fluxo normal é:

```bash
bluelab
```

Esse comando consulta exclusivamente:

```
BlueLab
```

A Espelunca nunca deve atualizar diretamente de `BlueLab-Test` ou de `mastodon/mastodon`.

## Segurança de atualização

O `bluelab` deve atualizar o checkout antes de executar Bundler/Rails.

A ordem esperada é:

1. identificar a instância e o canal;
2. buscar o remoto;
3. preservar alterações locais quando aplicável;
4. alinhar o checkout ao SHA do canal;
5. instalar/atualizar a cópia atual do comando `bluelab`;
6. garantir a versão de Ruby definida em `.ruby-version`;
7. executar Bundler, dependências, migrations e assets;
8. reiniciar os serviços;
9. validar serviços e Rails;
10. registrar o SHA implantado;
11. no Blue, executar a verificação upstream.

Nunca executar `bundle`, `rails` ou qualquer etapa dependente de Ruby antes de alinhar o checkout e preparar o runtime exigido por `.ruby-version`.

## Preservação de customizações

Atualizações upstream devem preservar as customizações do BlueLab.

Não substituir arquivos customizados inteiros por versões upstream apenas para eliminar conflitos.

Autenticação, autorização, passkeys, uploads, schema, migrations, navegação, compose, limites, cores e funcionalidades BlueLab são zonas de reconciliação semântica.

## Continuidade do sistema de atualização

Para alterações em:

- `bin/bluelab`;
- `bluelab/manifest.yml`;
- `docs/bluelab-update-system/`;
- mecanismos de prontidão/deploy;
- qualquer parte do pipeline de atualização;

consultar e atualizar o `docs/bluelab-update-system/PROGRESS.md` no mesmo lote.

Cada checkpoint deve registrar SHA e branch reais, alterações, validações, deploys, falhas relevantes e o único próximo passo seguro.

## Regra de promoção

Antes de promover `BlueLab-Test` para `BlueLab`:

- confirmar que o usuário aprovou o lote;
- confirmar que o Blue está exatamente no SHA testado;
- confirmar que esse SHA foi registrado como implantado/testado;
- confirmar que `BlueLab` é ancestral de `BlueLab-Test`;
- confirmar que não há alterações locais que invalidem o teste.

A promoção deve apontar para o mesmo commit exato testado no Blue.

## Regra para agentes

Quando um agente precisar explicar ou executar uma atualização, use `bluelab`.

Nunca reintroduza `blue-atualizar`, `espelunca-atualizar`, `bluelab-teste` ou `bluelab` como nomes de canais.

Os únicos nomes canônicos de canal são:

- `BlueLab-Test` = teste;
- `BlueLab` = estável/produção.
