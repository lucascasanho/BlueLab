import { setupPwaInstallPrompt } from './pwa_install';
import { setupLinkListeners } from './utils/links';

export function start() {
  setupLinkListeners();
  setupPwaInstallPrompt();
}
