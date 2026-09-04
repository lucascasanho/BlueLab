import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import { useHistory } from 'react-router';

import { MenuItem, MenuItemDivider } from '@/mastodon/components/menu';

interface MultiColumnMenuItemsProps {
  withDivider?: boolean;
  pinned: boolean;
  onPin: () => void;
  onMove?: (direction: number) => void;
}

export const MultiColumnMenuItems: React.FC<MultiColumnMenuItemsProps> = ({
  withDivider = false,
  onPin,
  onMove,
  pinned,
}) => {
  const history = useHistory();

  const togglePin = useCallback(() => {
    if (!pinned) {
      history.replace('/');
    }

    onPin();
  }, [history, pinned, onPin]);

  const moveLeft = useCallback(() => {
    onMove?.(-1);
  }, [onMove]);

  const moveRight = useCallback(() => {
    onMove?.(1);
  }, [onMove]);

  return (
    <>
      {withDivider && <MenuItemDivider />}
      <MenuItem onClick={togglePin} keepMenuOpenOnClick>
        {pinned ? (
          <FormattedMessage id='column_header.unpin' defaultMessage='Unpin' />
        ) : (
          <FormattedMessage id='column_header.pin' defaultMessage='Pin' />
        )}
      </MenuItem>
      {pinned && onMove && (
        <>
          <MenuItem onClick={moveLeft} keepMenuOpenOnClick>
            <FormattedMessage
              id='column_header.moveLeft_settings'
              defaultMessage='Move column to the left'
            />
          </MenuItem>
          <MenuItem onClick={moveRight} keepMenuOpenOnClick>
            <FormattedMessage
              id='column_header.moveRight_settings'
              defaultMessage='Move column to the right'
            />
          </MenuItem>
        </>
      )}
    </>
  );
};
