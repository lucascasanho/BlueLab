# Proteção contra cadastros automatizados

O BlueLab oferece uma proteção opcional para instâncias pequenas que usam
cadastros sujeitos a aprovação. Ela não usa CAPTCHA, JavaScript obrigatório,
fingerprinting persistente, geolocalização ou classificação automática por IA.

## Ativação

```dotenv
BLUELAB_REGISTRATION_PROTECTION=true
BLUELAB_DISABLE_API_SIGN_UP=true
BLUELAB_UNCONFIRMED_ACCOUNT_RETENTION_DAYS=3
```

Com a proteção habilitada:

- `POST /api/v1/accounts` pode ser desabilitado sem afetar o login OAuth de
  contas existentes;
- o formulário web recebe uma intenção aleatória vinculada à sessão, armazenada
  no Redis por duas horas e consumida uma única vez;
- submissões inválidas recebem um novo token e preservam os campos do formulário;
- limites de 24 horas complementam os limites curtos de criação de contas e
  aplicações OAuth;
- aplicações com a mesma assinatura são limitadas globalmente para conter troca
  de IP durante ondas distribuídas;
- a assinatura completa da sondagem `BoomProtocolProbe` observada na Espelunca é
  recusada antes de criar registros;
- respostas limitadas incluem `Retry-After`;
- somente contas com e-mail confirmado aparecem na fila de aprovação;
- contas ainda não confirmadas ficam no filtro administrativo separado;
- dez ou mais contas não confirmadas em 24 horas geram um alerta no painel para
  usuários com permissão real de gerenciar contas.

O endpoint `POST /api/v1/apps` permanece disponível porque aplicativos Mastodon
precisam registrar um cliente OAuth antes de autenticar usuários existentes.

## Limites adicionais

| Operação                    | Discriminador                        |     Limite |
| --------------------------- | ------------------------------------ | ---------: |
| Cadastro pela API           | IP ou `/64` IPv6                     |  5 por dia |
| Cadastro pela API           | `/24` IPv4 ou `/64` IPv6             | 20 por dia |
| Registro de aplicação OAuth | IP ou `/64` IPv6                     | 20 por dia |
| Registro de aplicação OAuth | `/24` IPv4 ou `/64` IPv6             | 50 por dia |
| Registro de aplicação OAuth | assinatura normalizada dos metadados | 25 por dia |

Os limites curtos nativos do Mastodon continuam ativos. Domínios de grandes
provedores de e-mail não são bloqueados automaticamente.

## Desativação e rollback operacional

Para desativar o escudo sem reverter código:

```dotenv
BLUELAB_REGISTRATION_PROTECTION=false
```

Depois, reinicie somente o serviço web da instância. Para reabrir apenas o
cadastro por aplicativos mantendo as outras camadas:

```dotenv
BLUELAB_DISABLE_API_SIGN_UP=false
```

Contas rejeitadas por moderação não são restauradas automaticamente por essas
variáveis. Antes de rejeições em lote, deve ser criado um registro forense
restrito contendo os identificadores selecionados e os critérios aplicados.
