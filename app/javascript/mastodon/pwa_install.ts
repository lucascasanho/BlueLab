import '@/styles/mastodon/pwa_install.scss';

type BeforeInstallPromptOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<InstallPromptChoice>;
  prompt(): Promise<InstallPromptChoice>;
}

interface InstallPromptChoice {
  outcome: BeforeInstallPromptOutcome;
  platform: string;
}

const INSTALL_PROMOTION_ID = 'pwa-install-promotion';
const MOBILE_MEDIA_QUERY = '(width <= 767px)';

interface WindowWithInstallPrompt extends Window {
  __mastodonBeforeInstallPrompt?: BeforeInstallPromptEvent | null;
}

const installWindow = window as WindowWithInstallPrompt;

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
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileViewport() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function configureInstanceInstallColors() {
  if (window.location.hostname === 'espelunca.social') {
    document.documentElement.style.setProperty(
      '--pwa-install-accent',
      '#b4148c',
    );
    document.documentElement.style.setProperty(
      '--pwa-install-accent-hover',
      '#951071',
    );
  }
}

function removeInstallPromotion() {
  installPromotion?.remove();
  installPromotion = null;
}

function getInstallCopy() {
  const language = document.documentElement.lang.toLowerCase();

  if (language.startsWith('es')) {
    return {
      title: 'Instala Espelunca como aplicación',
      message: 'Acesse rapidamente a Espelunca pela tela inicial.',
      install: 'Instalar',
      dismiss: 'Agora não',
    };
  }

  if (language.startsWith('fr')) {
    return {
      title: 'Installez Espelunca comme application',
      message: 'Acesse rapidement a Espelunca pela tela inicial.',
      install: 'Installer',
      dismiss: 'Pas maintenant',
    };
  }

  if (language.startsWith('en')) {
    return {
      title: 'Install Espelunca as an app',
      message: 'Get quick access to Espelunca from your home screen.',
      install: 'Install',
      dismiss: 'Not now',
    };
  }

  return {
    title: 'Instale a Espelunca como aplicativo',
    message: 'Tenha acesso rápido à Espelunca pela tela inicial.',
    install: 'Instalar',
    dismiss: 'Agora não',
  };
}

function showInstallPromotion() {
  if (
    !deferredInstallPrompt ||
    !isMobileViewport() ||
    isStandalone() ||
    installPromotion
  ) {
    return;
  }

  const copy = getInstallCopy();
  const promotion = document.createElement('aside');
  promotion.id = INSTALL_PROMOTION_ID;
  promotion.className = 'pwa-install-promotion';
  promotion.setAttribute('role', 'dialog');
  promotion.setAttribute('aria-live', 'polite');

  const message = document.createElement('span');
  message.className = 'pwa-install-promotion__message';
  message.textContent = copy.message;

  const actions = document.createElement('span');
  actions.className = 'pwa-install-promotion__actions';

  const installButton = document.createElement('button');
  installButton.type = 'button';
  installButton.className = 'pwa-install-promotion__install';
  installButton.textContent = copy.install;

  installButton.addEventListener('click', () => {
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    installWindow.__mastodonBeforeInstallPrompt = null;
    removeInstallPromotion();

    if (prompt) {
      void prompt.prompt().catch(() => undefined);
    }
  });

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'pwa-install-promotion__dismiss';
  dismissButton.textContent = copy.dismiss;

  dismissButton.addEventListener('click', () => {
    deferredInstallPrompt = null;
    installWindow.__mastodonBeforeInstallPrompt = null;
    removeInstallPromotion();
  });

  actions.append(installButton, dismissButton);
  promotion.append(message, actions);
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
  showInstallPromotion();
}

export function setupPwaInstallability() {
  if (isSetup) return;
  isSetup = true;

  configureInstanceInstallColors();

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installWindow.__mastodonBeforeInstallPrompt = null;
    removeInstallPromotion();
  });

  deferredInstallPrompt = installWindow.__mastodonBeforeInstallPrompt ?? null;
  installWindow.__mastodonBeforeInstallPrompt = null;
  showInstallPromotion();

  registerServiceWorker();
}
