type BeforeInstallPromptOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{
    outcome: BeforeInstallPromptOutcome;
    platform: string;
  }>;
}

const INSTALL_PROMOTION_ID = 'pwa-install-promotion';
const MOBILE_MEDIA_QUERY = '(width <= 767px)';

let isSetup = false;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let installPromotion: HTMLElement | null = null;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', type: 'module' })
    .catch(() => undefined);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isMobileViewport() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function removeInstallPromotion() {
  installPromotion?.remove();
  installPromotion = null;
}

function getInstallCopy() {
  const language = document.documentElement.lang.toLowerCase();

  if (language.startsWith('es')) {
    return {
      title: 'Instala .blue como aplicación',
      message: 'Accede rápidamente a .blue desde tu pantalla de inicio.',
      install: 'Instalar',
      dismiss: 'Ahora no',
    };
  }

  if (language.startsWith('fr')) {
    return {
      title: 'Installez .blue comme application',
      message: 'Accédez rapidement à .blue depuis votre écran d’accueil.',
      install: 'Installer',
      dismiss: 'Pas maintenant',
    };
  }

  if (language.startsWith('en')) {
    return {
      title: 'Install .blue as an app',
      message: 'Get quick access to .blue from your home screen.',
      install: 'Install',
      dismiss: 'Not now',
    };
  }

  return {
    title: 'Instale o .blue como aplicativo',
    message: 'Tenha acesso rápido ao .blue pela tela inicial.',
    install: 'Instalar',
    dismiss: 'Agora não',
  };
}

function showInstallPromotion() {
  if (
    !deferredInstallPrompt ||
    !isMobileViewport() ||
    isStandalone() ||
    installPromotion ||
    !document.body
  ) {
    return;
  }

  const copy = getInstallCopy();
  const promotion = document.createElement('aside');
  promotion.id = INSTALL_PROMOTION_ID;
  promotion.className = 'pwa-install-promotion';
  promotion.setAttribute('role', 'region');
  promotion.setAttribute('aria-label', copy.title);

  const content = document.createElement('div');
  content.className = 'pwa-install-promotion__content';

  const title = document.createElement('strong');
  title.className = 'pwa-install-promotion__title';
  title.textContent = copy.title;

  const message = document.createElement('span');
  message.className = 'pwa-install-promotion__message';
  message.textContent = copy.message;

  content.append(title, message);

  const actions = document.createElement('div');
  actions.className = 'pwa-install-promotion__actions';

  const installButton = document.createElement('button');
  installButton.className = 'button button--compact';
  installButton.type = 'button';
  installButton.textContent = copy.install;

  const dismissButton = document.createElement('button');
  dismissButton.className = 'button button--plain button--compact';
  dismissButton.type = 'button';
  dismissButton.textContent = copy.dismiss;

  installButton.addEventListener('click', async () => {
    const promptEvent = deferredInstallPrompt;

    if (!promptEvent) return;

    deferredInstallPrompt = null;
    removeInstallPromotion();

    try {
      await promptEvent.prompt();
    } catch {
      // The browser owns the install prompt lifecycle. There is nothing else
      // to do when the prompt cannot be shown.
    }
  });

  dismissButton.addEventListener('click', () => {
    deferredInstallPrompt = null;
    removeInstallPromotion();
  });

  actions.append(installButton, dismissButton);
  promotion.append(content, actions);

  document.body.append(promotion);
  installPromotion = promotion;
}

function handleBeforeInstallPrompt(event: Event) {
  const installEvent = event as BeforeInstallPromptEvent;

  if (!isMobileViewport() || isStandalone()) {
    return;
  }

  installEvent.preventDefault();
  deferredInstallPrompt = installEvent;

  if (document.body) {
    showInstallPromotion();
  } else {
    document.addEventListener('DOMContentLoaded', showInstallPromotion, {
      once: true,
    });
  }
}

export function setupPwaInstallability() {
  if (isSetup) return;
  isSetup = true;

  // Keep the browser's own installation UI on desktop. On mobile, take
  // control of beforeinstallprompt and expose a discoverable in-app action.
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    removeInstallPromotion();
  });

  registerServiceWorker();
}
