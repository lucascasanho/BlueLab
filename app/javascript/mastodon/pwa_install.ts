import '@/styles/mastodon/pwa_install.scss';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<InstallPromptChoice>;
  prompt(): Promise<InstallPromptChoice>;
}

interface InstallPromptChoice {
  outcome: 'accepted' | 'dismissed';
  platform: string;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface InstallCopy {
  message: (host: string) => string;
  install: string;
  dismiss: string;
}

const defaultInstallCopy: InstallCopy = {
  message: (host) => `Install ${host} as an app?`,
  install: 'Install',
  dismiss: 'Not now',
};

const installCopy: Partial<Record<string, InstallCopy>> = {
  en: defaultInstallCopy,
  es: {
    message: (host) => `¿Instalar ${host} como aplicación?`,
    install: 'Instalar',
    dismiss: 'Ahora no',
  },
  pt: {
    message: (host) => `Instalar ${host} como aplicativo?`,
    install: 'Instalar',
    dismiss: 'Agora não',
  },
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let installPromptElement: HTMLElement | null = null;
let isSetup = false;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

function isMobileInstallSurface() {
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 1024px)').matches
  );
}

function getCopy(): InstallCopy {
  const language =
    document.documentElement.lang.toLowerCase().split('-')[0] ?? 'en';
  return installCopy[language] ?? defaultInstallCopy;
}

function removeInstallPrompt() {
  installPromptElement?.remove();
  installPromptElement = null;
}

function showInstallPrompt() {
  if (installPromptElement) return;

  const copy = getCopy();
  const container = document.createElement('aside');
  container.className = 'pwa-install-prompt';
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-live', 'polite');

  const message = document.createElement('span');
  message.className = 'pwa-install-prompt__message';
  message.textContent = copy.message(window.location.hostname);

  const actions = document.createElement('span');
  actions.className = 'pwa-install-prompt__actions';

  const installButton = document.createElement('button');
  installButton.type = 'button';
  installButton.className = 'pwa-install-prompt__install';
  installButton.textContent = copy.install;
  installButton.addEventListener('click', () => {
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    removeInstallPrompt();

    if (prompt) {
      void prompt.prompt().catch(() => undefined);
    }
  });

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'pwa-install-prompt__dismiss';
  dismissButton.textContent = copy.dismiss;
  dismissButton.addEventListener('click', () => {
    deferredInstallPrompt = null;
    removeInstallPrompt();
  });

  actions.append(installButton, dismissButton);
  container.append(message, actions);
  document.body.append(container);
  installPromptElement = container;
}

function registerServiceWorkerForAllVisitors() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  void navigator.serviceWorker
    .register('/sw.js', {
      scope: '/',
      type: 'module',
    })
    .catch(() => undefined);
}

export function setupPwaInstallPrompt() {
  if (isSetup) return;
  isSetup = true;

  registerServiceWorkerForAllVisitors();

  window.addEventListener('beforeinstallprompt', (event) => {
    if (isStandalone() || !isMobileInstallSurface()) return;

    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    showInstallPrompt();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    removeInstallPrompt();
  });
}
