(function () {
  window.__mastodonBeforeInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    const isMobile =
      window.matchMedia('(width <= 767px)').matches ||
      window.matchMedia('(pointer: coarse)').matches;

    if (!isMobile) return;

    event.preventDefault();
    window.__mastodonBeforeInstallPrompt = event;
  });
})();
