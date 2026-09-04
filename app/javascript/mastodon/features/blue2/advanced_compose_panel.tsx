import { useCallback, useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import {
  composerOriginFromElement,
  openNewComposer,
} from '@/mastodon/reducers/slices/composer';
import { useAppDispatch } from '@/mastodon/store';

import { Blue2ComposeIcon } from './icons';
import { blue2Text } from './locale';
import classes from './advanced_compose_panel.module.scss';

interface TrendTag {
  name: string;
}

export const Blue2AdvancedComposePanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const [tags, setTags] = useState<TrendTag[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch('/api/v1/trends/tags?limit=10', {
          credentials: 'same-origin',
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as TrendTag[];
        setTags(data.slice(0, 10));
      } catch {
        // Trending hashtags are optional content. Keep the compose launcher
        // usable when the endpoint is unavailable or the request is aborted.
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const openComposer = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      dispatch(
        openNewComposer({
          type: 'post',
          origin: composerOriginFromElement(event.currentTarget),
        }),
      );
    },
    [dispatch],
  );

  return (
    <section className={classes.root}>
      <button
        type='button'
        className={classes.composeButton}
        onClick={openComposer}
      >
        <Blue2ComposeIcon size={19} />
        <span>{blue2Text(intl.locale, 'write')}</span>
      </button>

      <section className={classes.trends}>
        <div className={classes.trendsHeader}>
          <strong>
            ↗{' '}
            <FormattedMessage
              id='trends.trending_now'
              defaultMessage='Trending now'
            />
          </strong>
        </div>

        <ol className={classes.trendList}>
          {tags.map((tag, index) => (
            <li key={tag.name}>
              <span className={classes.rank}>{index + 1}.</span>
              <Link to={`/tags/${encodeURIComponent(tag.name)}`}>
                #{tag.name}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
};
