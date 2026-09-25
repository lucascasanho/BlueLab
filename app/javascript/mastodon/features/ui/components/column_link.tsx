import classNames from 'classnames';
import { NavLink, useLocation, useRouteMatch } from 'react-router-dom';

import { Icon } from 'mastodon/components/icon';
import type { IconProp } from 'mastodon/components/icon';
import type { MastodonLocationDescriptor } from 'mastodon/components/router';

export const ColumnLink: React.FC<{
  icon: React.ReactNode;
  iconComponent?: IconProp;
  activeIcon?: React.ReactNode;
  activeIconComponent?: IconProp;
  isActive?: (match: unknown, location: { pathname: string }) => boolean;
  text: string;
  to?: MastodonLocationDescriptor;
  href?: string;
  method?: string;
  badge?: React.ReactNode;
  transparent?: boolean;
  className?: string;
  exact?: boolean;
  id?: string;
}> = ({
  icon,
  activeIcon,
  iconComponent,
  activeIconComponent,
  text,
  to,
  href,
  method,
  badge,
  transparent,
  exact,
  isActive: isActiveProp,
  ...other
}) => {
  const location = useLocation();
  const match = useRouteMatch(
    (typeof to === 'string' ? to : to?.pathname) ?? '',
  );
  const className = classNames('column-link', {
    'column-link--transparent': transparent,
  });
  const badgeElement =
    typeof badge !== 'undefined' ? (
      <span className='column-link__badge'>{badge}</span>
    ) : null;
  const iconElement = iconComponent ? (
    <Icon
      id={typeof icon === 'string' ? icon : ''}
      icon={iconComponent}
      className='column-link__icon'
    />
  ) : (
    icon
  );
  const activeIconElement =
    activeIcon ??
    (activeIconComponent ? (
      <Icon
        id={typeof icon === 'string' ? icon : ''}
        icon={activeIconComponent}
        className='column-link__icon'
      />
    ) : (
      iconElement
    ));
  // Use the same active calculation for the rendered class and the icon.
  // This prevents NavLink's default prefix matching from leaving Home active
  // while the user is actually on a public feed.
  const active = isActiveProp ? isActiveProp(match, location) : !!match;

  if (href) {
    return (
      <a href={href} className={className} data-method={method} {...other}>
        {active ? activeIconElement : iconElement}
        <span>{text}</span>
        {badgeElement}
      </a>
    );
  } else if (to) {
    return (
      <NavLink
        to={to}
        className={() => classNames(className, { active })}
        activeClassName=''
        exact={exact}
        isActive={isActiveProp}
        {...other}
      >
        {active ? activeIconElement : iconElement}
        <span>{text}</span>
        {badgeElement}
      </NavLink>
    );
  } else {
    return null;
  }
};
