import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import { AvatarById } from '@/mastodon/components/avatar';
import { useIdentity } from '@/mastodon/identity_context';
import {
  composerOriginFromElement,
  openNewComposer,
} from '@/mastodon/reducers/slices/composer';
import { useAppDispatch } from '@/mastodon/store';

import classes from './compose_launcher.module.scss';
import { Blue2ComposeIcon } from './icons';

export const Blue2ComposeLauncher: React.FC = () => {
  const dispatch = useAppDispatch();
  const { accountId } = useIdentity();

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
    <button type='button' className={classes.root} onClick={openComposer}>
      <AvatarById accountId={accountId} size={40} />
      <span className={classes.prompt}>
        <FormattedMessage
          id='compose_form.placeholder'
          defaultMessage='What is on your mind?'
        />
      </span>
      <Blue2ComposeIcon size={22} />
    </button>
  );
};
