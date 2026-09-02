import { Link } from 'react-router-dom';

import { Blue2FeedIcon, Blue2SearchIcon } from './icons';
import classes from './right_rail.module.scss';

export const Blue2RightRail: React.FC = () => (
  <aside className={classes.root}>
    <Link className={classes.search} to='/explore'>
      <Blue2SearchIcon size={19} />
      <span>Pesquisar</span>
    </Link>

    <Link className={classes.feedShortcut} to='/home'>
      <span className={classes.feedIcon}>
        <Blue2FeedIcon size={18} />
      </span>
      <span>Seguindo</span>
    </Link>

    <Link className={classes.moreFeeds} to='/public/local'>
      <span>+</span>
      <span>Mais feeds</span>
    </Link>

    <section className={classes.card}>
      <div className={classes.cardHeader}>
        <strong>↗ Em alta</strong>
        <span>•••</span>
      </div>
      <ol>
        <li>
          <Link to='/explore'>Explorar assuntos em alta</Link>
        </li>
        <li>
          <Link to='/public/local'>Publicações locais</Link>
        </li>
        <li>
          <Link to='/public'>Fediverso</Link>
        </li>
        <li>
          <Link to='/followed_tags'>Hashtags seguidas</Link>
        </li>
      </ol>
    </section>

    <footer className={classes.footer}>
      <a href='/about'>Sobre</a>
      <span>·</span>
      <a href='/privacy-policy'>Privacidade</a>
      <span>·</span>
      <a href='/terms-of-service'>Termos</a>
    </footer>
  </aside>
);
