let isSetup = false;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', type: 'module' })
    .catch(() => undefined);
}

export function setupPwaInstallability() {
  if (isSetup) return;
  isSetup = true;

  // Do not intercept `beforeinstallprompt`. Chrome and Edge can then display
  // their own address-bar/mini-infobar promotion whenever their engagement
  // heuristics allow it, without adding any UI to the Mastodon page.
  registerServiceWorker();
}
