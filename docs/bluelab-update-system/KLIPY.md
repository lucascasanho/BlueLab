# KLIPY

O picker de GIF do compositor novo usa a API da KLIPY e fica disponível quando
`VITE_KLIPY_API_KEY` está configurada durante o build do frontend.

## Comando

Instale o comando uma vez:

```bash
cd ~/blue
chmod +x bin/klippy
mkdir -p ~/.local/bin
install -m 0755 bin/klippy ~/.local/bin/klippy
```

Depois execute-o de dentro da árvore Git da instância:

```bash
klippy
```

O comando identifica automaticamente a árvore da instalação e procura os serviços
systemd de web, Sidekiq e streaming cujo `WorkingDirectory` ou comando de
execução aponta para essa mesma árvore. Ele não depende de nomes como
`blue-web` ou `espelunca-web`.

A chave é validada primeiro contra `/v2/featured` da KLIPY. Somente depois de
uma resposta válida o comando atualiza `.env.production`, executa
`yarn build:production` e reinicia os serviços detectados. Se o build falhar,
nenhum serviço é reiniciado.

A chave não deve ser commitada no Git. Como é uma variável `VITE_*`, ela entra
no bundle do navegador durante a compilação.

Fontes:
- https://docs.klipy.com/
- https://docs.klipy.com/stickers-api
- https://www.freedesktop.org/software/systemd/man/systemctl.html
