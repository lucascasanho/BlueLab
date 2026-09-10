import { defineMessages, useIntl } from 'react-intl';

import VisibilityIcon from '@/material-icons/400-24px/visibility.svg?react';
import VisibilityOffIcon from '@/material-icons/400-24px/visibility_off.svg?react';
import { Icon } from '@/mastodon/components/icon';

import styles from './thread_visibility_toggle.module.scss';

const messages = defineMessages({
  showAll: {
    id: 'status.show_more_all',
    defaultMessage: 'Show more for all',
  },
  showLess: {
    id: 'status.show_less_all',
    defaultMessage: 'Show less for all',
  },
});

const compactLabels = {
  en: {
    showAll: 'Show all',
    showLess: 'Show less',
  },
  pt: {
    showAll: 'Mostrar tudo',
    showLess: 'Mostrar menos',
  },
} as const;

type CompactLabelKey = keyof (typeof compactLabels)['en'];

const getCompactLabel = (
  locale: string,
  key: CompactLabelKey,
  fallback: string,
) => {
  const language = locale.toLowerCase().split(/[-_]/)[0] ?? 'en';

  if (language === 'en' || language === 'pt') {
    return compactLabels[language][key];
  }

  return fallback;
};

export const ThreadVisibilityToggle: React.FC<{
  hidden: boolean;
  onClick: () => void;
}> = ({ hidden, onClick }) => {
  const intl = useIntl();
  const key: CompactLabelKey = hidden ? 'showAll' : 'showLess';
  const message = hidden ? messages.showAll : messages.showLess;
  const label = getCompactLabel(intl.locale, key, intl.formatMessage(message));

  return (
    <div className={styles.wrapper}>
      <button
        type='button'
        className={styles.button}
        title={label}
        aria-label={label}
        onClick={onClick}
      >
        <Icon
          id={hidden ? 'eye' : 'eye-slash'}
          icon={hidden ? VisibilityIcon : VisibilityOffIcon}
          className={styles.icon}
        />
        <span className={styles.label}>{label}</span>
      </button>
    </div>
  );
};
