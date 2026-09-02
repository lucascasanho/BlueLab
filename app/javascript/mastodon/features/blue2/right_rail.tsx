import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import PublicIcon from '@/material-icons/400-24px/public.svg?react';

import { Blue2HomeIcon, Blue2SearchIcon } from './icons';
import classes from './right_rail.module.scss';

type TrendTag = {
  name: string;
};

export const Blue2RightRail: React.FC = () => {
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
          <span>Pesquisar</span>
        </Link>

        <nav className={classes.feeds} aria-label='Timelines'>
          <Link className={classes.feedShortcut} to='/home'>
            <span className={classes.feedIcon}>
              <Blue2HomeIcon size={18} />
            </span>
            <span>Seguindo</span>
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

        <section className={classes.card}>
          <div className={classes.cardHeader}>
            <strong>↗ Em alta</strong>
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
      </div>

      <footer className={classes.footer}>
        <a href='/about'>Sobre</a>
        <span>·</span>
        <a href='/privacy-policy'>Privacidade</a>
        <span>·</span>
        <a href='/terms-of-service'>Termos</a>
      </footer>
    </aside>
  );
};
