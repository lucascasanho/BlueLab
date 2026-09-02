import { useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import MoreHorizIcon from '@/material-icons/400-24px/more_horiz.svg?react';
import PublicIcon from '@/material-icons/400-24px/public.svg?react';

import { Blue2HomeIcon, Blue2SearchIcon } from './icons';
import { blue2Text } from './locale';
import classes from './right_rail.module.scss';

type TrendTag = {
  name: string;
};

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

    return () => controller.abort();
  }, []);

  return (
    <aside className={classes.root}>
      <div className={classes.content}>
        <Link className={classes.search} to='/explore'>
          <Blue2SearchIcon size={19} />
          <FormattedMessage id='search.placeholder' defaultMessage='Search' />
        </Link>

        <nav className={classes.feeds} aria-label='Timelines'>
          <Link className={classes.feedShortcut} to='/home'>
            <span className={classes.feedIcon}>
              <Blue2HomeIcon size={18} />
            </span>
            <FormattedMessage id='account.following' defaultMessage='Following' />
          </Link>

          <Link className={classes.feedShortcut} to='/public/local'>
            <span className={classes.feedIcon}>
              <GroupsIcon />
            </span>
            <span>Federação</span>
          </Link>

          <Link className={classes.feedShortcut} to='/public'>
            <span className={classes.feedIcon}>
              <PublicIcon />
            </span>
            <span>Global</span>
          </Link>
        </nav>

        {!trendsHidden && (
          <section className={classes.card}>
            <div className={classes.cardHeader}>
              <strong>
                ↗ <FormattedMessage id='trends.trending_now' defaultMessage='Trending now' />
              </strong>
              <button
                className={classes.moreButton}
                type='button'
                aria-label={blue2Text(intl.locale, 'hideTrendsTitle')}
                onClick={() => setTrendMenuOpen(true)}
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

      <footer className={classes.footer}>
        <a href='/about'>
          <FormattedMessage id='custom_homepage.about' defaultMessage='About' />
        </a>
        <span>·</span>
        <a href='/privacy-policy'>
          <FormattedMessage
            id='footer.privacy_policy_short'
            defaultMessage='Privacy'
          />
        </a>
        <span>·</span>
        <a href='/terms-of-service'>
          <FormattedMessage
            id='footer.terms_of_service_short'
            defaultMessage='Terms'
          />
        </a>
      </footer>

      {trendMenuOpen && (
        <div
          className={classes.modalBackdrop}
          role='presentation'
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTrendMenuOpen(false);
          }}
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
              onClick={() => {
                setTrendsHidden(true);
                setTrendMenuOpen(false);
              }}
            >
              {blue2Text(intl.locale, 'hide')}
            </button>
            <button
              className={classes.modalSecondary}
              type='button'
              onClick={() => setTrendMenuOpen(false)}
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
