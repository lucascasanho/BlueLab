import { useCallback, useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import { blue2Text } from '@/bluelab/i18n/blue2';
import { Search } from '@/mastodon/features/compose/components/search';
import MoreHorizIcon from '@/material-icons/400-24px/more_horiz.svg?react';
import { Blue2ComposeButton } from './navigation';
import classes from './right_rail.module.scss';

interface TrendTag {
  name: string;
}

export const Blue2RightRail: React.FC = () => {
  const intl = useIntl();
  const [tags, setTags] = useState<TrendTag[]>([]);
  const [trendMenuOpen, setTrendMenuOpen] = useState(false);
  const [trendsHidden, setTrendsHidden] = useState(false);

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
        // Trending topics are optional decoration; keep the rail usable if
        // the endpoint is unavailable or the request is aborted.
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const openTrendMenu = useCallback(() => {
    setTrendMenuOpen(true);
  }, []);

  const closeTrendMenu = useCallback(() => {
    setTrendMenuOpen(false);
  }, []);

  const hideTrends = useCallback(() => {
    setTrendsHidden(true);
    setTrendMenuOpen(false);
  }, []);

  const handleBackdropMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        setTrendMenuOpen(false);
      }
    },
    [],
  );

  return (
    <aside className={classes.root}>
      <div className={classes.searchHost}>
        <Search singleColumn />
      </div>

      <Blue2ComposeButton className={classes.rightRailComposeButton} />

      <div className={classes.content}>
        {!trendsHidden && (
          <section className={classes.card}>
            <div className={classes.cardHeader}>
              <strong>
                ↗{' '}
                <FormattedMessage
                  id='trends.trending_now'
                  defaultMessage='Trending now'
                />
              </strong>
              <button
                className={classes.moreButton}
                type='button'
                aria-label={blue2Text(intl.locale, 'hideTrendsTitle')}
                onClick={openTrendMenu}
              >
                <MoreHorizIcon />
              </button>
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
        )}
      </div>

      {trendMenuOpen && (
        <div
          className={classes.modalBackdrop}
          role='presentation'
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            className={classes.trendModal}
            role='dialog'
            aria-modal='true'
            aria-labelledby='blue2-hide-trends-title'
          >
            <h2 id='blue2-hide-trends-title'>
              {blue2Text(intl.locale, 'hideTrendsTitle')}
            </h2>
            <p>{blue2Text(intl.locale, 'hideTrendsDescription')}</p>

            <button
              className={classes.modalPrimary}
              type='button'
              onClick={hideTrends}
            >
              {blue2Text(intl.locale, 'hide')}
            </button>
            <button
              className={classes.modalSecondary}
              type='button'
              onClick={closeTrendMenu}
            >
              <FormattedMessage
                id='confirmation_modal.cancel'
                defaultMessage='Cancel'
              />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
