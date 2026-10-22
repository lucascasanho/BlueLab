import { useCallback, useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import { ArrowUpIcon } from '@phosphor-icons/react';

import classes from './vanilla_scroll_to_top.module.scss';

const SCROLL_THRESHOLD = 320;
const SCROLLABLE_SELECTOR =
  '.scrollable, [data-scrollable], .column, .columns-area__panels__main, .main';

const getScrollables = (): HTMLElement[] => {
  const scrollables = new Set<HTMLElement>();
  const documentScroller = document.scrollingElement;

  if (documentScroller instanceof HTMLElement) {
    scrollables.add(documentScroller);
  }

  document
    .querySelectorAll<HTMLElement>(SCROLLABLE_SELECTOR)
    .forEach((element) => scrollables.add(element));

  return Array.from(scrollables);
};

const hasScrolled = () =>
  window.scrollY > SCROLL_THRESHOLD ||
  getScrollables().some((element) => element.scrollTop > SCROLL_THRESHOLD);

export const VanillaScrollToTop: React.FC = () => {
  const intl = useIntl();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const theme = document.body.dataset.theme;
    if (theme && theme !== 'default') return;

    const update = () => {
      setVisible(hasScrolled());
    };
    update();

    window.addEventListener('scroll', update, { passive: true });
    document.addEventListener('scroll', update, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      document.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, []);

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    getScrollables().forEach((element) => {
      if (element.scrollTop > 0) {
        element.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }, []);

  if (
    typeof document !== 'undefined' &&
    document.body.dataset.theme &&
    document.body.dataset.theme !== 'default'
  ) {
    return null;
  }

  const label = intl.formatMessage({
    id: 'column_header.scroll_to_top',
    defaultMessage: 'Scroll to top',
  });

  return (
    <button
      type='button'
      className={classes.root}
      data-visible={visible ? 'true' : 'false'}
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      <ArrowUpIcon aria-hidden='true' weight='bold' />
      <span className='sr-only'>{label}</span>
    </button>
  );
};
