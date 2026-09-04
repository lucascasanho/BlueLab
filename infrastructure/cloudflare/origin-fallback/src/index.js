const INSTANCE_BY_HOST = Object.freeze({
  'mastodon.blue': Object.freeze({
    name: 'Blue',
    statusUrl: 'https://status.mastodon.blue',
  }),
  'espelunca.social': Object.freeze({
    name: 'Espelunca',
    statusUrl: 'https://status.espelunca.social',
  }),
});

const CLOUDFLARE_ORIGIN_ERROR_STATUSES = new Set([520, 521, 522, 523, 524]);
const ERROR_BODY_PREFIX_LIMIT = 16 * 1024;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isDocumentNavigation(request) {
  if (request.method !== 'GET') return false;

  const destination = request.headers.get('sec-fetch-dest');
  if (destination) return destination === 'document';

  return request.headers.get('accept')?.includes('text/html') ?? false;
}

async function readBodyPrefix(response, limit = ERROR_BODY_PREFIX_LIMIT) {
  const body = response.clone().body;
  if (!body) return '';

  const reader = body.getReader();
  const chunks = [];
  let length = 0;

  try {
    while (length < limit) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = limit - length;
      const chunk =
        value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(chunk);
      length += chunk.byteLength;

      if (chunk.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
}

export async function classifyInterceptableError(response) {
  if (CLOUDFLARE_ORIGIN_ERROR_STATUSES.has(response.status)) {
    return String(response.status);
  }

  if (response.status !== 502 && response.status !== 530) return null;

  const prefix = await readBodyPrefix(response);

  if (
    response.status === 502 &&
    /unable to reach the origin service|cloudflared/i.test(prefix)
  ) {
    return '502';
  }

  if (
    response.status === 530 &&
    /error\s+code\s*:\s*1033|errorCode\s*:\s*1033|Cloudflare Tunnel error/i.test(
      prefix,
    )
  ) {
    return '1033';
  }

  return null;
}

export function renderUnavailablePage(instance, hostname, errorCode) {
  const safeName = escapeHtml(instance.name);
  const safeHostname = escapeHtml(hostname);
  const safeStatusUrl = escapeHtml(instance.statusUrl);
  const safeErrorCode = escapeHtml(errorCode);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>${safeName} está temporariamente indisponível</title>
  <style>
    :root{color-scheme:dark light;--bg:#000;--surface:#101820;--surface-2:#15202b;--border:#18242d;--text:#f7f7f8;--muted:#9aa8b4;--blue:#0085ff;--blue-action:#0075e2;--blue-action-hover:#006acb;--focus:#63b3ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
    *{box-sizing:border-box}
    body{min-height:100vh;min-height:100dvh;margin:0;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--text);font-size:16px;-webkit-font-smoothing:antialiased}
    main{width:min(100%,580px)}
    .brand{display:flex;align-items:center;gap:12px;margin:0 0 18px 4px;color:var(--text);font-size:17px;font-weight:700}
    .mark{width:42px;height:42px;flex:0 0 auto}
    .card{padding:clamp(28px,6vw,48px);border:1px solid var(--border);border-radius:16px;background:var(--surface)}
    .host{margin:0 0 18px;color:var(--blue);font-size:14px;font-weight:650}
    h1{max-width:480px;margin:0;font-size:clamp(28px,6vw,42px);line-height:1.08;letter-spacing:-.035em}
    .message{max-width:490px;margin:20px 0 0;color:var(--muted);font-size:16px;line-height:1.55}
    .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}
    .button{min-height:44px;padding:0 20px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:999px;background:var(--surface-2);color:var(--text);font-weight:700;text-decoration:none;transition:background-color 120ms ease,border-color 120ms ease}
    .button--primary{border-color:var(--blue-action);background:var(--blue-action);color:#fff}
    .button:hover{border-color:var(--muted);background:var(--bg)}
    .button--primary:hover{border-color:var(--blue-action-hover);background:var(--blue-action-hover)}
    .button:focus-visible,.footer a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
    .technical{margin:28px 0 0;color:var(--muted);font-size:12px}
    .footer{margin:18px 4px 0;display:flex;flex-wrap:wrap;gap:8px 16px;color:var(--muted);font-size:12px}
    .footer a{color:inherit;text-underline-offset:3px}
    @media(prefers-color-scheme:light){:root{--bg:#fff;--surface:#f3f3f8;--surface-2:#fff;--border:#dfe5e9;--text:#101114;--muted:#626b75;--blue:#006acb;--focus:#006acb}}
    @media(max-width:520px){body{padding:16px}.brand{margin-inline:2px}.card{padding:28px 22px;border-radius:14px}.actions{display:grid}.button{width:100%}.footer{margin-inline:2px}}
    @media(prefers-reduced-motion:reduce){.button{transition:none}}
  </style>
</head>
<body>
  <main>
    <div class="brand">
      <svg class="mark" viewBox="0 0 52 52" aria-hidden="true">
        <rect width="52" height="52" rx="16" fill="#0085ff"/>
        <path fill="#fff" d="M16 11h11c6 0 10 3 10 8 0 3-2 6-5 7 4 1 6 4 6 7 0 6-4 9-11 9H16V11Zm8 7v6h3c2 0 3-1 3-3s-1-3-3-3h-3Zm0 12v6h3c3 0 4-1 4-3s-1-3-4-3h-3Z"/>
      </svg>
      <span>BlueLab</span>
    </div>
    <section class="card" aria-labelledby="title">
      <p class="host">${safeHostname}</p>
      <h1 id="title">${safeName} está temporariamente indisponível</h1>
      <p class="message">O servidor pode estar sendo reiniciado, atualizado ou passando por uma interrupção temporária.</p>
      <div class="actions">
        <a class="button button--primary" href="https://${safeHostname}/">Tentar novamente</a>
        <a class="button" href="${safeStatusUrl}">Ver página de status</a>
      </div>
      <p class="technical">Erro de conexão com o servidor · ${safeErrorCode}</p>
    </section>
    <nav class="footer" aria-label="Páginas de status">
      <a href="https://status.mastodon.blue">Status do Blue</a>
      <a href="https://status.espelunca.social">Status da Espelunca</a>
    </nav>
  </main>
</body>
</html>`;
}

function unavailableResponse(
  instance,
  hostname,
  errorCode,
  status,
  retryAfter,
) {
  const headers = new Headers({
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
    'Content-Language': 'pt-BR',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Content-Type': 'text/html; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });

  if (retryAfter) headers.set('Retry-After', retryAfter);

  return new Response(renderUnavailablePage(instance, hostname, errorCode), {
    status,
    headers,
  });
}

export async function handleRequest(request, originFetch = fetch) {
  const url = new URL(request.url);
  const instance = INSTANCE_BY_HOST[url.hostname];

  if (!instance) {
    return new Response('Misdirected Request', {
      status: 421,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  let response;
  try {
    response = await originFetch(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'origin_fetch_failed',
        hostname: url.hostname,
        method: request.method,
        error: error instanceof Error ? error.name : 'UnknownError',
      }),
    );

    if (isDocumentNavigation(request)) {
      return unavailableResponse(instance, url.hostname, 'conexão', 503);
    }

    return new Response(null, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (!isDocumentNavigation(request)) return response;

  const errorCode = await classifyInterceptableError(response);
  if (!errorCode) return response;

  return unavailableResponse(
    instance,
    url.hostname,
    errorCode,
    response.status,
    response.headers.get('retry-after'),
  );
}

const worker = {
  async fetch(request) {
    return handleRequest(request);
  },
};

export default worker;
