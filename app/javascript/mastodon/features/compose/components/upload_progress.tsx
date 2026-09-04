import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { animated, useSpring } from '@react-spring/web';

import CloseIcon from '@/material-icons/400-20px/close.svg?react';
import UploadFileIcon from '@/material-icons/400-24px/upload_file.svg?react';
import { Icon } from 'mastodon/components/icon';

interface UploadProgressProps {
  active: boolean;
  progress: number;
  isProcessing?: boolean;
  filename?: string | null;
  loaded?: number;
  total?: number;
  onCancel?: () => void;
}

const formatMegabytes = (bytes: number) =>
  `${Math.round(bytes / (1024 * 1024)).toLocaleString()} MB`;

const messages = defineMessages({
  cancel: {
    id: 'upload_progress.cancel',
    defaultMessage: 'Cancel upload',
  },
});

export const UploadProgress: React.FC<UploadProgressProps> = ({
  active,
  progress,
  isProcessing = false,
  filename,
  loaded = 0,
  total = 0,
  onCancel,
}) => {
  const intl = useIntl();
  const styles = useSpring({
    from: { width: '0%' },
    to: { width: `${progress}%` },
    immediate: !active, // If this is not active, update the UI immediately.
  });
  if (!active) {
    return null;
  }

  return (
    <div className='upload-progress'>
      <Icon id='upload' icon={UploadFileIcon} />

      <div className='upload-progress__message'>
        <span>
          {isProcessing ? (
            <FormattedMessage
              id='upload_progress.processing'
              defaultMessage='Processing…'
            />
          ) : (
            <FormattedMessage
              id='upload_progress.label'
              defaultMessage='Uploading…'
            />
          )}
        </span>

        {filename && (
          <span className='upload-progress__filename' title={filename}>
            {filename}
          </span>
        )}

        {total > 0 && !isProcessing && (
          <span className='upload-progress__bytes'>
            {formatMegabytes(loaded)} / {formatMegabytes(total)} ({progress}%)
          </span>
        )}

        <div className='upload-progress__backdrop'>
          <animated.div className='upload-progress__tracker' style={styles} />
        </div>
      </div>

      {onCancel && (
        <button
          type='button'
          className='icon-button upload-progress__cancel'
          onClick={onCancel}
          aria-label={intl.formatMessage(messages.cancel)}
        >
          <Icon id='close' icon={CloseIcon} />
        </button>
      )}
    </div>
  );
};
