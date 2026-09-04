import { setupPwaInstallability } from './pwa_install';
import { setupLinkListeners } from './utils/links';

export function start() {
  setupLinkListeners();
  setupPwaInstallability();
}
