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

## Estrutura verificada do deploy

O deploy é standalone e executado diretamente no WSL2, sem contêineres.

- Usuário dos processos da aplicação: `espelunca`.
- Diretório de trabalho das unidades: `/home/espelunca/espelunca`.
- Rails e Sidekiq usam o Ruby gerenciado por rbenv em
  `/home/espelunca/.rbenv`.
- Nginx recebe HTTP local em `127.0.0.1:80` e encaminha as requisições
  para os componentes da aplicação.
- Puma/Rails escuta em `127.0.0.1:3001`.
- O streaming efetivo escuta em `127.0.0.1:4001`.
- Redis dedicado da instância escuta em `127.0.0.1:6380` e usa a unidade
  `redis-server@espelunca.service`.
- PostgreSQL escuta em `127.0.0.1:5432`.
- Há um processo `cloudflared` com listener local em `127.0.0.1:20241`,
  mas não existe uma unidade de sistema `cloudflared.service` no WSL.

As portas acima foram verificadas no ambiente de produção. Não confundir
com as portas padrão dos exemplos do repositório oficial.

## Upstream e legado

A política atual é acompanhar exclusivamente as versões estáveis do
Mastodon oficial, preservando as customizações da Espelunca em repositório
próprio. A configuração Git atual é:

- branch de trabalho e produção: `main`;
- `origin`: `git@github.com:lucascasanho/Espelunca.git`;
- `upstream`: `https://github.com/mastodon/mastodon.git`;
- `bluelab`: `https://github.com/MastodonBlue/BlueLab.git`, somente legado;
- `glitch`: `https://github.com/glitch-soc/mastodon.git`, somente legado.

A branch `main` deve rastrear `origin/main`. A referência
`backup-before-espelunca-origin-2026-08-27` preserva o estado da migração para
o repositório próprio. As branches e os remotes legados não devem ser usados
como fonte de novas atualizações nem removidos sem análise do histórico.

Atualizações do Mastodon oficial não são automáticas. Use `git fetch upstream`
para consultar novas versões e integre a versão estável escolhida à `main`
somente após diagnóstico, ponto de recuperação e análise dos conflitos. Nunca
faça merge indiscriminado de `upstream/main` na produção.

O build da instância usa o metadado `Espelunca` e deve exibir uma versão como
`4.8.0-alpha.1+Espelunca`. O link de código-fonte deve apontar para
`lucascasanho/Espelunca`, preservando Mastodon como nome do software oficial.

### Fallback de bandeiras Unicode no Windows

A Espelunca preserva uma correção em
`app/javascript/mastodon/features/emoji/mode.ts` para tratar bandeiras Unicode
como não suportadas nativamente no Chromium/Edge para Windows. Esses
navegadores podem exibir os dois Regional Indicator Symbols como letras, e o
teste de pixels do upstream pode dar falso positivo. A correção reutiliza o
modo `native-flags` e os assets Twemoji já existentes, substituindo somente
bandeiras e mantendo os demais emojis nativos. Ao integrar o upstream,
preserve essa intenção até que o detector oficial cubra o Windows de forma
equivalente.

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
- espelunca-streaming@4001

Função verificada de cada unidade:

- `espelunca-web.service`: executa Puma/Rails em produção, porta 3001, com
  `WEB_CONCURRENCY=1` e `MAX_THREADS=5`.
- `espelunca-sidekiq.service`: executa Sidekiq com concorrência 3.
- `espelunca-streaming.service`: unidade agregadora `oneshot`; aparecer como
  `active (exited)` é normal e não comprova sozinho que o streaming funciona.
- `espelunca-streaming@4001.service`: processo Node de streaming efetivo na
  porta 4001.
- `redis-server@espelunca.service`: Redis dedicado na porta 6380.
- `nginx.service`: proxy HTTP local na porta 80.
- `postgresql.service` é uma unidade agregadora; para diagnóstico, confirme
  também o cluster PostgreSQL efetivo e o processo que escuta na porta 5432.

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

Comandos de leitura úteis no deploy atual:

- `systemctl status espelunca-web espelunca-sidekiq
espelunca-streaming espelunca-streaming@4001 --no-pager -l`
- `systemctl status nginx redis-server@espelunca postgresql --no-pager -l`
- `journalctl -u espelunca-web -u espelunca-sidekiq
-u espelunca-streaming@4001 --since "30 minutes ago" --no-pager`
- `ss -lntp` para confirmar os listeners esperados nas portas 80, 3001, 4001,
  5432, 6380 e 20241.
- `curl -H 'Host: espelunca.social' http://127.0.0.1/` para testar o Nginx
  local sem depender de DNS, Cloudflare ou da rede pública.
- `curl -H 'Host: espelunca.social' http://127.0.0.1:3001/` para isolar
  Puma/Rails do Nginx.
- `curl http://127.0.0.1:4001/api/v1/streaming/health` para testar o processo
  de streaming diretamente.
- `df -h / /home/espelunca/espelunca` e `free -h` para verificar disco e
  memória.

Ao testar com `curl`, registre também o código HTTP. Uma falha no acesso
público com os testes locais saudáveis direciona a investigação para Nginx,
túnel Cloudflare, DNS ou rede, em vez de Puma e streaming.

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
