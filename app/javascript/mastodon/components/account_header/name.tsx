import { useCallback, useId, useState } from 'react';
import type { FC } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useRelationship } from '@/mastodon/hooks/useRelationship';
import { useAppSelector } from '@/mastodon/store';
import HelpIcon from '@/material-icons/400-24px/help.svg?react';

import { FollowsYouBadge } from '../badge';
import { DisplayName } from '../display_name';
import { useAccountHandle } from '../display_name/default';
import { Icon } from '../icon';
import { NavigationFocusTarget } from '../navigation_focus_target';
import { Popover } from '../popover';

import classes from './styles.module.scss';

const messages = defineMessages({
  lockedInfo: {
    id: 'account.locked_info',
    defaultMessage:
      'This account privacy status is set to locked. The owner manually reviews who can follow them.',
  },
  nameInfo: {
    id: 'account.name_info',
    defaultMessage: 'What does this mean?',
  },
});

export const AccountName: FC<{ accountId: string }> = ({ accountId }) => {
  const account = useAccount(accountId);
  const localDomain = useAppSelector(
    (state) => state.meta.get('domain') as string,
  );
  const relationship = useRelationship(accountId);
  const handle = useAccountHandle(account, localDomain);

  if (!account) {
    return null;
  }

  const domainSeparator = handle?.lastIndexOf('@') ?? -1;
  const handleUsername =
    domainSeparator > 0 ? handle?.slice(0, domainSeparator) : handle;
  const handleDomain =
    domainSeparator > 0 ? handle?.slice(domainSeparator) : null;

  return (
    <div className={classes.nameWrapper}>
      <div className={classes.name}>
        <NavigationFocusTarget as='h1'>
          <DisplayName account={account} variant='simple' />
        </NavigationFocusTarget>
        {relationship?.followed_by && <FollowsYouBadge />}
      </div>

      {account.invalid_handle ? (
        <InvalidAccountHelp />
      ) : (
        <span className={classes.handleText}>
          {handleUsername}
          {handleDomain && (
            <span className='blue2-profile-handle-domain'>{handleDomain}</span>
          )}
        </span>
      )}
    </div>
  );
};

const InvalidAccountHelp: FC = () => {
  const accessibilityId = useId();
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [triggerElement, setTriggerElement] =
    useState<HTMLButtonElement | null>(null);

  const handleClick = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return (
    <>
      <button
        type='button'
        ref={setTriggerElement}
        className={classNames(classes.handleHelpButton)}
        onClick={handleClick}
        aria-expanded={open}
        aria-controls={accessibilityId}
      >
        <FormattedMessage
          id='account.hame.invalid_handle'
          defaultMessage='Handle unavailable'
        />

        <Icon
          id='help'
          icon={HelpIcon}
          aria-label={intl.formatMessage(messages.nameInfo)}
        />
      </button>

      <Popover
        isOpen={open}
        reference={triggerElement}
        onClose={handleClick}
        offset={5}
      >
        {({ props }) => (
          <div
            {...props}
            role='region'
            id={accessibilityId}
            className={classNames('dropdown-animation', classes.handleHelp)}
          >
            <FormattedMessage
              id='account.name.help.invalid_header'
              defaultMessage="This user's handle is being updated"
              tagName='h3'
            />
            <FormattedMessage
              id='account.name.help.invalid_explanation'
              defaultMessage='This can happen when a user changes username, and is generally temporary. If this persists, it may be because of an unavailable server or some misconfiguration on their end.'
              tagName='p'
            />
          </div>
        )}
      </Popover>
    </>
  );
};
