import { useCallback, useEffect, useState } from 'react';

import KeyboardArrowUpIcon from '@/material-icons/400-24px/keyboard_arrow_up.svg?react';

import classes from './scroll_to_top.module.scss';

const hasScrolled = () => {
  if (window.scrollY > 420) return true;

  return Array.from(
    document.querySelectorAll<HTMLElement>('.scrollable, [data-scrollable]'),
  ).some((element) => element.scrollTop > 420);
};

export const Blue2ScrollToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(hasScrolled());
    update();

    window.addEventListener('scroll', update, { passive: true });
    document.addEventListener('scroll', update, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener('scroll', update);
      document.removeEventListener('scroll', update, true);
    };
  }, []);

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document
      .querySelectorAll<HTMLElement>('.scrollable, [data-scrollable]')
      .forEach((element) => {
        if (element.scrollTop > 0) {
          element.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
  }, []);

  return (
    <button
      type='button'
      className={classes.root}
      data-visible={visible ? 'true' : 'false'}
      onClick={handleClick}
      aria-label='Voltar ao topo'
      title='Voltar ao topo'
    >
      <KeyboardArrowUpIcon />
    </button>
  );
};
