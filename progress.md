# Progresso — PWA do BlueLab / Mastodon

## Objetivo

Replicar no `mastodon.blue` e, posteriormente, no `espelunca.social`, a configuração PWA validada na `espelunca.blue`, mantendo a instalação nativa do navegador sem criar botão de instalação dentro do site.

## Configuração que funcionou na espelunca.blue

- Manifesto servido em `/manifest.json`.
- `start_url: "/"`.
- `scope: "/"`.
- `display: "standalone"`.
- `display_override`: `window-controls-overlay`, `standalone`.
- `theme_color`: `#006AFF`.
- `background_color`: `#000000`.
- Ícones normais separados dos ícones `maskable`.
- Ícones normais de pelo menos 192x192 em PNG com `purpose: "any"`.
- Ícones maskable dedicados de 192x192 e 512x512 em PNG com `purpose: "maskable"`.
- Service Worker em `/sw.js`, com versão de cache incrementada quando os assets PWA mudarem.
- Favicon do site permanece separado do ícone usado pelo manifesto.
- Capturas de tela declaradas no manifesto:
  - `/screenshots/desktop-home.png`, `form_factor: "wide"`
  - `/screenshots/mobile-home.png`
- As capturas precisam existir publicamente e ser servidas como PNG.

## Descoberta importante

As capturas de tela **não são apenas decorativas** para este caso. Na configuração testada na `espelunca.blue`, a inclusão das capturas no manifesto foi necessária para o Chrome Mobile disponibilizar/disparar o botão nativo de instalação do PWA.

Portanto, ao reproduzir em `mastodon.blue` e `espelunca.social`, não remover as entradas `screenshots` do manifesto.

## Ícones

Os PNGs gerados para a web devem permanecer em 8-bit e ser quadrados.

A versão normal deve preservar o tamanho/proporção visual correta da marca. Evitar reduzir artificialmente a arte apenas para tentar atender a área segura.

A versão `maskable` deve possuir uma margem segura suficiente para que as máscaras de sistemas móveis não cortem a marca.

Não reutilizar o mesmo arquivo para `any` e `maskable` quando isso prejudicar a composição.

## Build

O processo de build deve:

1. Gerar/copiar o manifesto e o Service Worker.
2. Gerar/copiar os ícones normais.
3. Gerar/copiar os ícones maskable.
4. Copiar as duas capturas de tela.
5. Validar dimensões quadradas dos PNGs.
6. Validar que os PNGs gerados são 8-bit.
7. Publicar tudo no mesmo diretório estático servido pela aplicação.

## Cache

Depois de alterar ícones, manifesto, screenshots ou Service Worker, lembrar que existem três possíveis níveis de cache:

- build local / diretório `dist`;
- Cloudflare;
- Service Worker/cache do navegador.

Depois de uma alteração de PWA, verificar os arquivos públicos com `curl` antes de diagnosticar o Chrome.

## Validação

Verificar publicamente:

```bash
curl -s https://DOMINIO/manifest.json
```

E para cada asset:

```bash
curl -sI https://DOMINIO/icons/icon-192.png
curl -sI https://DOMINIO/icons/icon-512.png
curl -sI https://DOMINIO/icons/icon-192-maskable.png
curl -sI https://DOMINIO/icons/icon-512-maskable.png
curl -sI https://DOMINIO/screenshots/desktop-home.png
curl -sI https://DOMINIO/screenshots/mobile-home.png
```

Esperar `HTTP 200` e `content-type: image/png` nos PNGs.

No Chrome:

```
F12 -> Application -> Manifest
F12 -> Application -> Service Workers
```

Confirmar que o manifesto é reconhecido e que os ícones e capturas aparecem.

## Próximas instâncias

### mastodon.blue

Implementar primeiro no ambiente BlueLab/teste e validar a instalação nativa no Chrome Mobile.

Itens principais:

- manifesto PWA;
- Service Worker;
- ícones `any`;
- ícones `maskable`;
- screenshot desktop;
- screenshot mobile;
- validação do botão nativo de instalação no Chrome Mobile.

### espelunca.social

Depois que a configuração estiver validada no `mastodon.blue`, adaptar a mesma estrutura para a `espelunca.social`, respeitando o processo de publicação/atualização da instância.

## Regra de promoção

Testar primeiro no `mastodon.blue`. Só replicar/promover para `espelunca.social` após a configuração estar funcionando no teste.

## Referência de sucesso

A implementação da `espelunca.blue` foi validada com:

- manifesto reconhecido pelo Chrome;
- ícones normais e maskable visíveis no painel Manifest;
- capturas de tela reconhecidas;
- botão nativo de instalação disparado no Chrome Mobile.
