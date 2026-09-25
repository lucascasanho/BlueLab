// These angles match Mastodon's existing spring-rotate-in/out keyframes.
const springRotateIn = [
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(-484.8deg)', offset: 0.3 },
  { transform: 'rotate(-316.7deg)', offset: 0.6 },
  { transform: 'rotate(-375deg)', offset: 0.9 },
  { transform: 'rotate(-360deg)' },
];

const springRotateOut = [
  { transform: 'rotate(-360deg)' },
  { transform: 'rotate(124.8deg)', offset: 0.3 },
  { transform: 'rotate(-43.27deg)', offset: 0.6 },
  { transform: 'rotate(15deg)', offset: 0.9 },
  { transform: 'rotate(0deg)' },
];

export function animateFavouriteIcon(
  button: Element,
  active: boolean,
): void {
  if (!document.documentElement.classList.contains('no-reduce-motion')) {
    return;
  }

  const icon = button.querySelector<HTMLElement>('.icon');

  if (!icon || typeof icon.animate !== 'function') {
    return;
  }

  icon.animate(active ? springRotateOut : springRotateIn, {
    duration: 1000,
    easing: 'linear',
    fill: 'none',
  });
}
