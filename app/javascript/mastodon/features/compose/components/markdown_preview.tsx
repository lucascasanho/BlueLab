import type React from 'react';
import { useCallback, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { EyeIcon } from '@phosphor-icons/react';

import api from '@/mastodon/api';
import { IconButton as RedesignIconButton } from '@/mastodon/components/button/redesign';
import { CircularProgress } from '@/mastodon/components/circular_progress';
import { IconButton } from '@/mastodon/components/icon_button';
import { PopoverMenuCard } from '@/mastodon/components/menu/card';

import classes from './markdown_preview.module.scss';

const messages = defineMessages({
  button: { id: 'compose_form.markdown_preview', defaultMessage: 'Preview' },
  title: {
    id: 'compose_form.markdown_preview.title',
    defaultMessage: 'Post preview',
  },
  empty: {
    id: 'compose_form.markdown_preview.empty',
    defaultMessage: 'Write something to preview.',
  },
  error: {
    id: 'compose_form.markdown_preview.error',
    defaultMessage: 'The preview could not be loaded.',
  },
});

interface PreviewResponse {
  content: string;
}

interface Props {
  contentType: string;
  redesign?: boolean;
  text: string;
}

export const MarkdownPreview: React.FC<Props> = ({
  contentType,
  redesign = false,
  text,
}) => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const loadPreview = useCallback(() => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(false);

    void api()
      .post<PreviewResponse>('/api/v1/statuses/preview', {
        status: text,
        content_type: contentType,
      })
      .then(({ data }) => {
        if (requestId.current === currentRequest) setContent(data.content);
      })
      .catch(() => {
        if (requestId.current === currentRequest) setError(true);
      })
      .finally(() => {
        if (requestId.current === currentRequest) setLoading(false);
      });
  }, [contentType, text]);

  const close = useCallback(() => {
    requestId.current += 1;
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      close();
    } else {
      setOpen(true);
      loadPreview();
    }
  }, [close, loadPreview, open]);

  if (contentType !== 'text/markdown') return null;

  const label = intl.formatMessage(messages.button);
  const button = redesign ? (
    <RedesignIconButton
      icon={EyeIcon}
      size='sm'
      ref={setTrigger}
      aria-expanded={open}
      color={open ? 'accent' : 'tonal'}
      onClick={toggle}
    >
      {label}
    </RedesignIconButton>
  ) : (
    <IconButton
      title={label}
      icon='eye'
      iconComponent={EyeIcon}
      ref={setTrigger}
      expanded={open}
      active={open}
      onClick={toggle}
    />
  );

  return (
    <>
      {button}

      <PopoverMenuCard
        isOpen={open}
        onClose={close}
        reference={trigger}
        placement='top-start'
        maxWidth={420}
        className={classes.card}
      >
        <div className={classes.header}>
          {intl.formatMessage(messages.title)}
        </div>
        <div className={classes.body} aria-live='polite'>
          {loading ? (
            <div className={classes.message}>
              <CircularProgress size={28} strokeWidth={3} />
            </div>
          ) : error ? (
            <div className={classes.message}>
              {intl.formatMessage(messages.error)}
            </div>
          ) : content ? (
            <div className='status__content'>
              <div
                className='status__content__text'
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          ) : (
            <div className={classes.message}>
              {intl.formatMessage(messages.empty)}
            </div>
          )}
        </div>
      </PopoverMenuCard>
    </>
  );
};
