(function () {
  window.__mastodonBeforeInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__mastodonBeforeInstallPrompt = event;
  });
})();
