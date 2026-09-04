interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let isSetup = false;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

function isMobileBrowser() {
  return window.matchMedia('(pointer: coarse)').matches;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', type: 'module' })
    .catch(() => undefined);
}

function promptOnFirstTouch() {
  const onFirstTouch = () => {
    const prompt = deferredInstallPrompt;
    if (!prompt) return;

    // Chromium requires a user activation for its own install dialog. A touch
    // is the earliest possible activation without adding site UI or changing
    // the page layout.
    deferredInstallPrompt = null;
    void prompt
      .prompt()
      .then(() => prompt.userChoice)
      .catch(() => undefined);
  };

  window.addEventListener('pointerdown', onFirstTouch, {
    once: true,
    capture: true,
  });
}

export function setupPwaInstallPrompt() {
  if (isSetup) return;
  isSetup = true;

  registerServiceWorker();

  window.addEventListener('beforeinstallprompt', (event) => {
    if (isStandalone() || !isMobileBrowser()) return;

    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    promptOnFirstTouch();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
  });
}
