import { useCallback } from 'react';

import { FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';
import { NavLink } from 'react-router-dom';

import {
  CaretRightIcon,
  HouseIcon,
  StackIcon,
  StarIcon,
} from '@phosphor-icons/react';

import { blue2Text } from '@/bluelab/i18n/blue2';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useIdentity } from '@/mastodon/identity_context';
import {
  composerOriginFromElement,
  openNewComposer,
} from '@/mastodon/reducers/slices/composer';
import { selectUnreadNotificationGroupsCount } from '@/mastodon/selectors/notifications';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import TrendingUpIcon from '@/material-icons/400-24px/trending_up.svg?react';

import { Blue2AccountMenu } from './account_menu';
import { Blue2Announcements } from './announcements';
import {
  Blue2BellIcon,
  Blue2BookmarkIcon,
  Blue2ComposeIcon,
  Blue2FeedIcon,
  Blue2ListIcon,
  Blue2MessageIcon,
  Blue2ProfileIcon,
  Blue2SearchIcon,
  Blue2SettingsIcon,
} from './icons';
import classes from './navigation.module.scss';

interface ItemProps {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  exact?: boolean;
  badge?: number;
  iconClassName?: string;
  className?: string;
  isActive?: React.ComponentProps<typeof NavLink>['isActive'];
}

export const Blue2ComposeButton: React.FC<{
  onCompose?: () => void;
  className?: string;
}> = ({ onCompose, className }) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const { signedIn } = useIdentity();

  const openComposer = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      dispatch(
        openNewComposer({
          type: 'post',
          origin: composerOriginFromElement(event.currentTarget),
        }),
      );
      onCompose?.();
    },
    [dispatch, onCompose],
  );

  if (!signedIn) return null;

  return (
    <button
      className={classNames(classes.composeButton, className)}
      type='button'
      onClick={openComposer}
    >
      <Blue2ComposeIcon size={19} />
      <span>{blue2Text(intl.locale, 'write')}</span>
    </button>
  );
};

const neverActive: NonNullable<ItemProps['isActive']> = () => false;

const Item: React.FC<ItemProps> = ({
  to,
  icon: Icon,
  children,
  exact,
  badge,
  iconClassName,
  className,
  isActive,
}) => (
  <NavLink
    to={to}
    exact={exact}
    className={className ? `${classes.item} ${className}` : classes.item}
    activeClassName={classes.itemActive}
    isActive={isActive}
  >
    <Icon size={27} className={iconClassName} />
    <span>{children}</span>
    {!!badge && badge > 0 && <span className={classes.badge}>{badge}</span>}
  </NavLink>
);

export const Blue2Navigation: React.FC<{
  onCompose?: () => void;
  compact?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}> = ({ onCompose, compact, expanded, onToggleExpanded }) => {
  const intl = useIntl();
  const { accountId, signedIn } = useIdentity();
  const account = useAccount(accountId);
  const notificationsCount = useAppSelector(
    selectUnreadNotificationGroupsCount,
  );

  const profilePath = account?.acct ? `/@${account.acct}` : '/home';
  const collectionsPath = account?.acct
    ? `/@${account.acct}/collections`
    : '/home';

  return (
    <nav
      className={classNames(
        classes.root,
        compact && classes.rootCompact,
        expanded && classes.rootExpanded,
      )}
      aria-label='BLUE 2.0'
    >
      {compact && (
        <button
          type='button'
          className={classes.expandButton}
          onClick={onToggleExpanded}
          aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
          aria-expanded={expanded}
        >
          <CaretRightIcon size={24} />
        </button>
      )}
      {signedIn && <Blue2AccountMenu compact={compact && !expanded} />}

      <div className={classes.items}>
        {compact && (
          <Item to='/home' icon={HouseIcon} exact>
            <FormattedMessage id='tabs_bar.home' defaultMessage='Home' />
          </Item>
        )}

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
            <Blue2Announcements
              variant='navigation'
              className={classes.item}
              badgeClassName={classes.badge}
            />
            <Item to='/conversations' icon={Blue2MessageIcon}>
              <FormattedMessage
                id='tabs_bar.messages'
                defaultMessage='Messages'
                description='Message refers to a direct message. For languages where this is confusing, "chat" or "direct message" can be used.'
              />
            </Item>
          </>
        )}

        <Item to='/public/local' icon={Blue2FeedIcon}>
          <FormattedMessage
            id='tabs_bar.fediverse_feeds'
            defaultMessage='Fediverse Feeds'
          />
        </Item>
        <Item
          to='/explore'
          icon={TrendingUpIcon}
          iconClassName={classes.trendingIcon}
          isActive={neverActive}
        >
          {blue2Text(intl.locale, 'trendingFeeds')}
        </Item>

        {signedIn && (
          <>
            <Item to='/lists' icon={Blue2ListIcon}>
              <FormattedMessage
                id='navigation_bar.lists'
                defaultMessage='Lists'
              />
            </Item>
            <Item to='/favourites' icon={StarIcon}>
              <FormattedMessage
                id='navigation_bar.favourites'
                defaultMessage='Favorites'
              />
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
            <Item to={profilePath} icon={Blue2ProfileIcon} exact>
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

      <Blue2ComposeButton onCompose={onCompose} />
    </nav>
  );
};
