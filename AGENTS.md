# Espelunca — instruções para o Codex

## Ambiente

Este repositório é a instância Mastodon Espelunca.

- Site: https://espelunca.social
- Sistema host: Windows 11
- Ambiente: WSL2 Debian
- Diretório do projeto: ~/espelunca
- Não usa Docker
- Ambiente Rails: production
- Distribuição: Mastodon oficial
- A instância deve acompanhar versões estáveis recentes do Mastodon oficial.

## Objetivos principais

O Codex deve auxiliar principalmente em:

1. atualizações do Mastodon oficial;
2. preservação das customizações da Espelunca;
3. resolução de conflitos durante atualizações;
4. diagnóstico de falhas;
5. correções de funcionamento;
6. manutenção e desenvolvimento da interface.

## Princípio fundamental

Nunca descarte customizações locais para facilitar uma atualização.

Antes de qualquer atualização, investigue a situação atual e identifique:

- branch atual;
- git status;
- remotes;
- versão instalada;
- versão alvo;
- commits locais;
- alterações locais;
- customizações que podem conflitar com o upstream.

Não comece uma atualização se houver alterações não protegidas.

## Git

As customizações da Espelunca devem permanecer versionadas em Git.

Antes de alterações importantes, verifique `git status` e `git diff`.

Quando uma nova customização permanente for criada, ela deve ser
registrada de forma segura em Git.

Nunca execute automaticamente:

- git reset --hard
- git clean -f
- git clean -fd
- git checkout -- .
- git restore .
- git push --force

Nunca descarte mudanças locais sem compreender o que elas fazem.

## Atualizações

Quando o administrador pedir uma atualização:

Primeiro faça somente diagnóstico.

Informe:

- versão atual;
- versão estável alvo do Mastodon oficial;
- estado do Git;
- alterações relevantes do upstream;
- possíveis conflitos;
- migrations existentes;
- alterações de dependências;
- riscos encontrados;
- plano de rollback.

Antes de modificar a instalação, preserve um ponto seguro de recuperação.

Ao resolver conflitos, preserve a intenção das customizações existentes
e adapte-as ao código novo quando necessário.

Nunca escolha automaticamente "ours" ou "theirs" apenas para resolver
um conflito.

Use os procedimentos recomendados pela versão atual do Mastodon oficial.
Não presuma que comandos de versões antigas continuam válidos.

## Banco de dados

O banco de produção contém dados reais e deve ser tratado como crítico.

Antes de migrations importantes, informe o que será executado.

Nunca execute operações destrutivas no PostgreSQL.

São proibidos sem instrução humana expressa:

- DROP DATABASE
- DROP TABLE
- TRUNCATE
- exclusões em massa
- restaurações destrutivas

Quando houver risco relevante ao banco, pare e peça autorização.

## Mídia

Nunca apagar ou limpar automaticamente:

- public/system
- uploads
- anexos
- avatares
- headers
- emojis
- backups

## Serviços

Os serviços da Espelunca usam o prefixo `espelunca`.

Os principais incluem:

- espelunca-web
- espelunca-sidekiq
- espelunca-streaming

Antes de operar serviços, confirme os nomes existentes com systemd.

Pode consultar livremente:

- systemctl status
- systemctl is-active
- journalctl
- ss -lntp
- ps
- curl localhost
- df -h
- free -h

Peça autorização antes de reiniciar serviços de produção.

Não reinicie Windows ou WSL para solucionar um problema comum.

## Diagnóstico

Quando houver um problema:

1. investigue primeiro;
2. consulte logs;
3. verifique serviços;
4. verifique portas;
5. verifique resposta HTTP local;
6. verifique recursos da máquina;
7. verifique Git quando o problema puder estar relacionado ao código;
8. determine a causa provável;
9. somente depois proponha ou aplique a correção.

Prefira sempre a solução menos invasiva e mais reversível.

## Ações que exigem autorização

Peça autorização antes de:

- usar sudo para fazer alterações;
- reiniciar serviços;
- executar migrations importantes;
- alterar systemd;
- alterar nginx;
- alterar Cloudflare;
- alterar PostgreSQL;
- alterar Redis;
- alterar .env.production;
- alterar secrets;
- instalar ou atualizar pacotes do sistema;
- executar apt upgrade;
- git push;
- reboot;
- shutdown.

## Ações destrutivas

Nunca execute por iniciativa própria:

- rm -rf em diretórios importantes;
- comandos de destruição do banco;
- remoção de mídia;
- remoção de backups;
- git reset --hard;
- git clean -fd;
- force push;
- formatação de discos;
- reinicialização da máquina inteira.

Se uma ação destrutiva parecer necessária, pare e explique o motivo.

## Validação após alterações

Depois de uma correção ou atualização relevante, valide quando aplicável:

- git status;
- versão instalada;
- serviços;
- Rails/Puma;
- Sidekiq;
- streaming;
- portas locais;
- resposta HTTP local;
- resposta pública de espelunca.social;
- logs recentes.

Nunca declare uma atualização ou correção concluída sem validação.

## Comunicação

Responda sempre em português do Brasil.

O administrador quer aprender como o sistema funciona.

Explique resumidamente:

- o que encontrou;
- por que aconteceu;
- quais comandos importantes foram usados;
- quais arquivos foram modificados;
- como a solução foi validada.

Não seja excessivamente verboso em tarefas rotineiras.
