export type ComposeScrollZone = 'editor' | 'panel' | 'body';

export interface ComposeScrollTarget {
  zone: ComposeScrollZone;
  element: HTMLElement;
}

const COMPOSE_SCROLL_SELECTOR = '[data-compose-scroll-container]';
const COMPOSE_EDITOR_SELECTOR = '[data-compose-scroll-zone="editor"]';
const COMPOSE_PANEL_SELECTOR = '[data-compose-scroll-zone="panel"]';

export const resolveComposeScrollTarget = (
  source: EventTarget | null,
): ComposeScrollTarget | null => {
  let element: HTMLElement | null = null;

  if (source instanceof HTMLElement) {
    element = source;
  } else if (source instanceof Node) {
    element = source.parentElement;
  }

  if (!element) return null;

  const composerContent = element.closest<HTMLElement>(COMPOSE_SCROLL_SELECTOR);
  const editor = element.closest<HTMLElement>(COMPOSE_EDITOR_SELECTOR);
  const panel = element.closest<HTMLElement>(COMPOSE_PANEL_SELECTOR);

  if (editor) {
    return { zone: 'editor', element: editor };
  }

  if (panel) {
    return { zone: 'panel', element: panel };
  }

  if (composerContent) {
    return { zone: 'body', element: composerContent };
  }

  return null;
};
