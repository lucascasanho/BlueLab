# KLIPY no BlueLab-Test

O picker de GIF do compositor novo é opcional e fica ativo quando
`VITE_KLIPY_API_KEY` existe no ambiente de produção usado pelo build Vite.

## Instalação do comando

Depois de atualizar a cópia local para a branch `BlueLab-Test`, instale o comando uma vez:

```bash
cd ~/blue
chmod +x bin/klippy
mkdir -p ~/.local/bin
install -m 0755 bin/klippy ~/.local/bin/klippy
```

Verifique:

```bash
command -v klippy
```

## Ativação

Execute:

```bash
klippy
```

O comando:

1. confirma que está na branch `BlueLab-Test`;
2. pede a chave Test da KLIPY no terminal sem mostrar os caracteres;
3. grava a chave somente em `.env.production`;
4. executa `yarn build:production`;
5. só reinicia o Blue se o build terminar com sucesso;
6. verifica se `blue-web.service` ficou ativo.

A chave não deve ser commitada ou publicada no GitHub.

## Desativação

Para remover o recurso do build local:

```bash
cd ~/blue
sed -i '/^VITE_KLIPY_API_KEY=/d' .env.production
yarn build:production
blue-reiniciar
```

## Observação sobre a chave

A integração usa a chave no cliente porque o Vite incorpora `VITE_*` ao bundle. Portanto a chave Test não deve ser tratada como segredo de servidor.

Fontes:
- https://docs.klipy.com/
- https://docs.klipy.com/stickers-api
