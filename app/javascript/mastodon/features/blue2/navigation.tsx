import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { Avatar } from '@/mastodon/components/avatar';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useIdentity } from '@/mastodon/identity_context';
import {
  composerOriginFromElement,
  openNewComposer,
} from '@/mastodon/reducers/slices/composer';
import { selectUnreadNotificationGroupsCount } from '@/mastodon/selectors/notifications';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import {
  Blue2BellIcon,
  Blue2BookmarkIcon,
  Blue2ComposeIcon,
  Blue2FeedIcon,
  Blue2HomeIcon,
  Blue2ListIcon,
  Blue2MessageIcon,
  Blue2ProfileIcon,
  Blue2SearchIcon,
  Blue2SettingsIcon,
} from './icons';
import classes from './navigation.module.scss';

type ItemProps = {
  to: string;
  icon: React.FC<{ size?: number | string; weight?: string }>;
  children: React.ReactNode;
  exact?: boolean;
  badge?: number;
};

const Item: React.FC<ItemProps> = ({ to, icon: Icon, children, exact, badge }) => (
  <NavLink
    to={to}
    exact={exact}
    className={classes.item}
    activeClassName={classes.itemActive}
  >
    <Icon size={27} />
    <span>{children}</span>
    {!!badge && badge > 0 && <span className={classes.badge}>{badge}</span>}
  </NavLink>
);

export const Blue2Navigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const { accountId } = useIdentity();
  const account = useAccount(accountId);
  const notificationsCount = useAppSelector(selectUnreadNotificationGroupsCount);

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

  const profilePath = account?.acct ? `/@${account.acct}` : '/home';

  return (
    <nav className={classes.root} aria-label='BLUE 2.0'>
      <NavLink to={profilePath} className={classes.avatarLink}>
        <Avatar account={account} size={42} />
      </NavLink>

      <div className={classes.items}>
        <Item to='/home' exact icon={Blue2HomeIcon}>
          <FormattedMessage id='tabs_bar.home' defaultMessage='Home' />
        </Item>
        <Item to='/explore' icon={Blue2SearchIcon}>
          <FormattedMessage id='tabs_bar.explore' defaultMessage='Explore' />
        </Item>
        <Item to='/notifications' icon={Blue2BellIcon} badge={notificationsCount}>
          <FormattedMessage id='tabs_bar.notifications' defaultMessage='Notifications' />
        </Item>
        <Item to='/conversations' icon={Blue2MessageIcon}>
          <FormattedMessage id='tabs_bar.messages' defaultMessage='Messages' />
        </Item>
        <Item to='/public/local' icon={Blue2FeedIcon}>
          <FormattedMessage id='tabs_bar.fediverse_feeds' defaultMessage='Feeds' />
        </Item>
        <Item to='/lists' icon={Blue2ListIcon}>
          <FormattedMessage id='navigation_bar.lists' defaultMessage='Lists' />
        </Item>
        <Item to='/bookmarks' icon={Blue2BookmarkIcon}>
          <FormattedMessage id='tabs_bar.saved' defaultMessage='Saved' />
        </Item>
        <Item to={profilePath} icon={Blue2ProfileIcon}>
          <FormattedMessage id='navigation_bar.profile' defaultMessage='Profile' />
        </Item>

        <a className={classes.item} href='/settings/preferences'>
          <Blue2SettingsIcon size={27} />
          <span>
            <FormattedMessage id='tabs_bar.settings' defaultMessage='Settings' />
          </span>
        </a>
      </div>

      <button className={classes.composeButton} type='button' onClick={openComposer}>
        <Blue2ComposeIcon size={19} />
        <FormattedMessage id='tabs_bar.publish' defaultMessage='New post' />
      </button>
    </nav>
  );
};
