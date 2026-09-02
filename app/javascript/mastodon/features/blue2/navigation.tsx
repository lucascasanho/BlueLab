import { useCallback } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { StackIcon } from '@phosphor-icons/react';

import TrendingUpIcon from '@/material-icons/400-24px/trending_up.svg?react';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useIdentity } from '@/mastodon/identity_context';
import {
  composerOriginFromElement,
  openNewComposer,
} from '@/mastodon/reducers/slices/composer';
import { selectUnreadNotificationGroupsCount } from '@/mastodon/selectors/notifications';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import { Blue2AccountMenu } from './account_menu';
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
import { blue2Text } from './locale';
import classes from './navigation.module.scss';

type ItemProps = {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  exact?: boolean;
  badge?: number;
  iconClassName?: string;
};

const Item: React.FC<ItemProps> = ({
  to,
  icon: Icon,
  children,
  exact,
  badge,
  iconClassName,
}) => (
  <NavLink
    to={to}
    exact={exact}
    className={classes.item}
    activeClassName={classes.itemActive}
  >
    <Icon size={27} className={iconClassName} />
    <span>{children}</span>
    {!!badge && badge > 0 && <span className={classes.badge}>{badge}</span>}
  </NavLink>
);

export const Blue2Navigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const { accountId, signedIn } = useIdentity();
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
  const collectionsPath = account?.acct
    ? `/@${account.acct}/collections`
    : '/home';
  const homePath = signedIn ? '/home' : '/';

  return (
    <nav className={classes.root} aria-label='BLUE 2.0'>
      {signedIn && <Blue2AccountMenu />}

      <div className={classes.items}>
        <Item to={homePath} exact icon={Blue2HomeIcon}>
          <FormattedMessage id='tabs_bar.home' defaultMessage='Home' />
        </Item>
        <Item to='/explore' icon={Blue2SearchIcon}>
          <FormattedMessage id='tabs_bar.explore' defaultMessage='Explore' />
        </Item>

        {signedIn && (
          <>
            <Item
              to='/notifications'
              icon={Blue2BellIcon}
              badge={notificationsCount}
            >
              <FormattedMessage
                id='tabs_bar.notifications'
                defaultMessage='Notifications'
              />
            </Item>
            <Item to='/conversations' icon={Blue2MessageIcon}>
              <FormattedMessage id='tabs_bar.messages' defaultMessage='Messages' />
            </Item>
          </>
        )}

        <Item to='/public/local' icon={Blue2FeedIcon}>
          <FormattedMessage
            id='tabs_bar.fediverse_feeds'
            defaultMessage='Feeds'
          />
        </Item>
        <Item
          to='/explore'
          icon={TrendingUpIcon}
          iconClassName={classes.trendingIcon}
        >
          {blue2Text(intl.locale, 'trendingFeeds')}
        </Item>

        {signedIn && (
          <>
            <Item to='/lists' icon={Blue2ListIcon}>
              <FormattedMessage id='navigation_bar.lists' defaultMessage='Lists' />
            </Item>
            <Item to='/bookmarks' icon={Blue2BookmarkIcon}>
              <FormattedMessage id='tabs_bar.saved' defaultMessage='Saved' />
            </Item>
            <Item to={collectionsPath} icon={StackIcon}>
              <FormattedMessage
                id='navigation_bar.collections'
                defaultMessage='Collections'
              />
            </Item>
            <Item to={profilePath} icon={Blue2ProfileIcon}>
              {blue2Text(intl.locale, 'profile')}
            </Item>

            <a className={classes.item} href='/settings/preferences'>
              <Blue2SettingsIcon size={27} />
              <span>
                <FormattedMessage
                  id='navigation_bar.preferences'
                  defaultMessage='Preferences'
                />
              </span>
            </a>
          </>
        )}
      </div>

      {signedIn && (
        <button
          className={classes.composeButton}
          type='button'
          onClick={openComposer}
        >
          <Blue2ComposeIcon size={19} />
          <span>{blue2Text(intl.locale, 'write')}</span>
        </button>
      )}
    </nav>
  );
};
