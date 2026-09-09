/* eslint-disable react/jsx-no-bind, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-misused-promises -- Scheduled entries use item-scoped accessible form handlers. */
/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect -- Minimum timestamps and initial API loading are intentionally captured at interaction time. */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';
import type { AxiosResponse } from 'axios';

import api, {
  apiRequestDelete,
  apiRequestPost,
  apiRequestPut,
  getLinks,
} from '@/mastodon/api';
import type {
  ApiScheduledStatusJSON,
  ApiScheduledStatusParams,
  ApiScheduledThreadJSON,
} from '@/mastodon/api_types/scheduled_statuses';
import type { StatusVisibility } from '@/mastodon/api_types/statuses';
import { Button } from '@/mastodon/components/button/redesign';
import { Column } from '@/mastodon/components/column';
import { ColumnHeader } from '@/mastodon/components/column_header';

import classes from './styles.module.scss';

const messages = defineMessages({
  heading: {
    id: 'scheduled_publications.title',
    defaultMessage: 'Scheduled publications',
  },
  cancelConfirm: {
    id: 'scheduled_publications.cancel_confirm',
    defaultMessage:
      'Cancel this scheduled publication? Already-published thread posts will be kept.',
  },
  dateTime: {
    id: 'scheduled_publications.date_time',
    defaultMessage: 'Date and time',
  },
  content: { id: 'scheduled_publications.content', defaultMessage: 'Content' },
  contentWarning: {
    id: 'scheduled_publications.content_warning',
    defaultMessage: 'Content warning',
  },
  language: {
    id: 'scheduled_publications.language',
    defaultMessage: 'Language',
  },
  visibility: {
    id: 'scheduled_publications.visibility',
    defaultMessage: 'Visibility',
  },
  format: { id: 'scheduled_publications.format', defaultMessage: 'Format' },
  alt: { id: 'scheduled_publications.alt', defaultMessage: 'Alternative text' },
});

interface PageData {
  statuses: ApiScheduledStatusJSON[];
  threads: ApiScheduledThreadJSON[];
}

interface NextPages {
  statuses?: string;
  threads?: string;
}

interface EditableItem extends ApiScheduledStatusParams {
  status: string;
  spoiler_text: string;
  sensitive: boolean;
  visibility: StatusVisibility;
  language: string;
  content_type: string;
  media_ids: string[];
  media_alt: Record<string, string>;
}

const localDateTimeValue = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const apiDateTime = (local: string) => new Date(local).toISOString();

const editableItem = (item: ApiScheduledStatusJSON): EditableItem => ({
  ...item.params,
  status: item.params.text,
  spoiler_text: item.params.spoiler_text ?? '',
  sensitive: item.params.sensitive ?? false,
  visibility: item.params.visibility ?? 'public',
  language: item.params.language ?? '',
  content_type: item.params.content_type ?? 'text/plain',
  media_ids: item.media_attachments.map((media) => media.id),
  media_alt: Object.fromEntries(
    item.media_attachments.map((media) => [media.id, media.description ?? '']),
  ),
});

const requestPage = async (url: string) =>
  api().get<ApiScheduledStatusJSON[] | ApiScheduledThreadJSON[]>(url);

const nextUrl = (response: AxiosResponse) =>
  getLinks(response).rel('next')[0]?.uri;

export const ScheduledPublications: React.FC = () => {
  const intl = useIntl();
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const [data, setData] = useState<PageData>({ statuses: [], threads: [] });
  const [next, setNext] = useState<NextPages>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statuses, threads] = await Promise.all([
        requestPage('/api/v1/scheduled_statuses'),
        requestPage('/api/v1/scheduled_threads'),
      ]);
      setData({
        statuses: statuses.data as ApiScheduledStatusJSON[],
        threads: threads.data as ApiScheduledThreadJSON[],
      });
      setNext({ statuses: nextUrl(statuses), threads: nextUrl(threads) });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : String(requestError),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const [statuses, threads] = await Promise.all([
        next.statuses ? requestPage(next.statuses) : undefined,
        next.threads ? requestPage(next.threads) : undefined,
      ]);
      setData((current) => ({
        statuses: [
          ...current.statuses,
          ...((statuses?.data ?? []) as ApiScheduledStatusJSON[]),
        ],
        threads: [
          ...current.threads,
          ...((threads?.data ?? []) as ApiScheduledThreadJSON[]),
        ],
      }));
      setNext({
        statuses: statuses ? nextUrl(statuses) : undefined,
        threads: threads ? nextUrl(threads) : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [next]);

  const removeStatus = useCallback(
    async (id: string) => {
      if (!window.confirm(intl.formatMessage(messages.cancelConfirm))) return;
      await apiRequestDelete(`v1/scheduled_statuses/${id}`);
      await load();
    },
    [intl, load],
  );

  const removeThread = useCallback(
    async (id: string) => {
      if (!window.confirm(intl.formatMessage(messages.cancelConfirm))) return;
      await apiRequestDelete(`v1/scheduled_threads/${id}`);
      await load();
    },
    [intl, load],
  );

  const retryThread = useCallback(
    async (id: string) => {
      await apiRequestPost(`v1/scheduled_threads/${id}/retry`);
      await load();
    },
    [load],
  );

  const entries = useMemo(
    () =>
      [
        ...data.statuses.map((status) => ({
          type: 'status' as const,
          value: status,
        })),
        ...data.threads.map((thread) => ({
          type: 'thread' as const,
          value: thread,
        })),
      ].sort(
        (a, b) =>
          Date.parse(a.value.scheduled_at) - Date.parse(b.value.scheduled_at),
      ),
    [data],
  );

  return (
    <Column bindToDocument label={intl.formatMessage(messages.heading)}>
      <ColumnHeader
        title={intl.formatMessage(messages.heading)}
        withBackButton='auto'
      />
      <div className={classes.root}>
        <p className={classes.intro}>
          <FormattedMessage
            id='scheduled_publications.timezone'
            defaultMessage='Times are shown in your browser timezone: {timezone}.'
            values={{ timezone }}
          />
        </p>
        {error && (
          <p role='alert' className={classes.error}>
            {error}
          </p>
        )}
        {!loading && entries.length === 0 && (
          <p className={classes.empty}>
            <FormattedMessage
              id='scheduled_publications.empty'
              defaultMessage='You have no scheduled publications.'
            />
          </p>
        )}
        <div className={classes.list}>
          {entries.map((entry) =>
            entry.type === 'status' ? (
              <ScheduledCard
                key={`status-${entry.value.id}`}
                status={entry.value}
                timezone={timezone}
                onDelete={removeStatus}
                onSaved={load}
              />
            ) : (
              <ScheduledThreadCard
                key={`thread-${entry.value.id}`}
                thread={entry.value}
                timezone={timezone}
                onDelete={removeThread}
                onRetry={retryThread}
                onSaved={load}
              />
            ),
          )}
        </div>
        {(next.statuses !== undefined || next.threads !== undefined) && (
          <Button
            className={classes.loadMore}
            loading={loading}
            onClick={loadMore}
          >
            <FormattedMessage
              id='scheduled_publications.load_more'
              defaultMessage='Load more'
            />
          </Button>
        )}
      </div>
      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

const ScheduledCard: React.FC<{
  status: ApiScheduledStatusJSON;
  timezone: string;
  onDelete: (id: string) => Promise<void>;
  onSaved: () => Promise<void>;
}> = ({ status, timezone, onDelete, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [dateTime, setDateTime] = useState(
    localDateTimeValue(status.scheduled_at),
  );
  const [item, setItem] = useState(() => editableItem(status));
  const [saving, setSaving] = useState(false);

  const saveTime = async () => {
    setSaving(true);
    try {
      await apiRequestPut(`v1/scheduled_statuses/${status.id}`, {
        scheduled_at: apiDateTime(dateTime),
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await updateMediaAlt(item);
      await apiRequestPut(`v1/scheduled_statuses/${status.id}/replace`, {
        ...item,
        scheduled_at: apiDateTime(dateTime),
      });
      setEditing(false);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={classes.card}>
      <CardHeader
        title={
          <FormattedMessage
            id='scheduled_publications.single'
            defaultMessage='Scheduled post'
          />
        }
        date={status.scheduled_at}
        timezone={timezone}
      />
      <ScheduledItemView item={status} index={0} total={1} />
      <div className={classes.scheduleRow}>
        <label>
          <FormattedMessage {...messages.dateTime} />
          <input
            type='datetime-local'
            value={dateTime}
            min={localDateTimeValue(
              new Date(Date.now() + 300_000).toISOString(),
            )}
            onChange={(event) => setDateTime(event.target.value)}
          />
        </label>
        <Button onClick={saveTime} loading={saving}>
          <FormattedMessage
            id='scheduled_publications.change_time'
            defaultMessage='Change time'
          />
        </Button>
      </div>
      {editing && <ItemEditor item={item} onChange={setItem} />}
      <div className={classes.actions}>
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)}>
              <FormattedMessage
                id='scheduled_publications.close_editor'
                defaultMessage='Close editor'
              />
            </Button>
            <Button
              color='accent'
              variant='solid'
              onClick={saveAll}
              loading={saving}
            >
              <FormattedMessage
                id='scheduled_publications.save'
                defaultMessage='Save changes'
              />
            </Button>
          </>
        ) : (
          <Button onClick={() => setEditing(true)}>
            <FormattedMessage
              id='scheduled_publications.edit'
              defaultMessage='Edit'
            />
          </Button>
        )}
        <Button color='destructive' onClick={() => void onDelete(status.id)}>
          <FormattedMessage
            id='scheduled_publications.cancel'
            defaultMessage='Cancel schedule'
          />
        </Button>
      </div>
    </article>
  );
};

const ScheduledThreadCard: React.FC<{
  thread: ApiScheduledThreadJSON;
  timezone: string;
  onDelete: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  onSaved: () => Promise<void>;
}> = ({ thread, timezone, onDelete, onRetry, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [dateTime, setDateTime] = useState(
    localDateTimeValue(thread.scheduled_at),
  );
  const [items, setItems] = useState(() => thread.items.map(editableItem));
  const [saving, setSaving] = useState(false);
  const hasStarted = thread.published_status_ids.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(items.map(updateMediaAlt));
      await apiRequestPut(`v1/scheduled_threads/${thread.id}`, {
        scheduled_at: apiDateTime(dateTime),
        ...(editing ? { items } : {}),
      });
      setEditing(false);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={classes.card}>
      <CardHeader
        title={
          <FormattedMessage
            id='scheduled_publications.thread'
            defaultMessage='Scheduled thread · {count, plural, one {# post} other {# posts}}'
            values={{ count: thread.items.length }}
          />
        }
        date={thread.scheduled_at}
        timezone={timezone}
        state={thread.state}
      />
      {thread.last_error && (
        <p role='alert' className={classes.failure}>
          <FormattedMessage
            id='scheduled_publications.failure'
            defaultMessage='Publication stopped safely: {error}'
            values={{ error: thread.last_error }}
          />
        </p>
      )}
      <div className={classes.threadItems}>
        {thread.items.map((status, index) => (
          <div key={status.id}>
            <ScheduledItemView
              item={status}
              index={index}
              total={thread.items.length}
              published={!!status.published_status_id}
            />
            {editing && items[index] && (
              <ItemEditor
                item={items[index]}
                onChange={(value) =>
                  setItems((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index ? value : entry,
                    ),
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
      <div className={classes.scheduleRow}>
        <label>
          <FormattedMessage {...messages.dateTime} />
          <input
            type='datetime-local'
            value={dateTime}
            min={localDateTimeValue(
              new Date(Date.now() + 300_000).toISOString(),
            )}
            onChange={(event) => setDateTime(event.target.value)}
          />
        </label>
      </div>
      <div className={classes.actions}>
        {!hasStarted && !editing && (
          <Button onClick={() => setEditing(true)}>
            <FormattedMessage
              id='scheduled_publications.edit_thread'
              defaultMessage='Edit thread'
            />
          </Button>
        )}
        {!hasStarted && editing && (
          <Button onClick={() => setEditing(false)}>
            <FormattedMessage
              id='scheduled_publications.close_editor'
              defaultMessage='Close editor'
            />
          </Button>
        )}
        <Button color='accent' variant='solid' onClick={save} loading={saving}>
          <FormattedMessage
            id='scheduled_publications.save'
            defaultMessage='Save changes'
          />
        </Button>
        {thread.state === 'failed' && (
          <Button onClick={() => void onRetry(thread.id)}>
            <FormattedMessage
              id='scheduled_publications.retry'
              defaultMessage='Retry remaining posts'
            />
          </Button>
        )}
        <Button color='destructive' onClick={() => void onDelete(thread.id)}>
          <FormattedMessage
            id='scheduled_publications.cancel'
            defaultMessage='Cancel schedule'
          />
        </Button>
      </div>
    </article>
  );
};

const CardHeader: React.FC<{
  title: React.ReactNode;
  date: string;
  timezone: string;
  state?: string;
}> = ({ title, date, timezone, state }) => (
  <header className={classes.cardHeader}>
    <div>
      <h3 className={classes.title}>{title}</h3>
      <p className={classes.schedule}>
        <time dateTime={date}>
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: timezone,
          }).format(new Date(date))}
        </time>{' '}
        · {timezone}
      </p>
    </div>
    {state && <span className={classes.state}>{state}</span>}
  </header>
);

const ScheduledItemView: React.FC<{
  item: ApiScheduledStatusJSON;
  index: number;
  total: number;
  published?: boolean;
}> = ({ item, index, total, published }) => (
  <section className={classes.item}>
    <div className={classes.itemHeader}>
      <strong>
        {index + 1}/{total}
      </strong>
      {published && (
        <span className={classes.state}>
          <FormattedMessage
            id='scheduled_publications.published'
            defaultMessage='Published'
          />
        </span>
      )}
    </div>
    {item.params.spoiler_text && (
      <p className={classes.cw}>CW: {item.params.spoiler_text}</p>
    )}
    <p className={classes.content}>{item.params.text}</p>
    {item.media_attachments.length > 0 && (
      <div className={classes.mediaGrid}>
        {item.media_attachments.map((media) => (
          <figure className={classes.media} key={media.id}>
            {media.type === 'image' || media.type === 'gifv' ? (
              <img src={media.preview_url} alt={media.description ?? ''} />
            ) : (
              <video
                src={media.url}
                controls
                aria-label={media.description ?? undefined}
              />
            )}
            <figcaption>
              ALT:{' '}
              {media.description ?? (
                <FormattedMessage
                  id='scheduled_publications.no_alt'
                  defaultMessage='Not provided'
                />
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    )}
    <p className={classes.metadata}>
      {item.params.visibility ?? 'public'} · {item.params.language ?? '—'} ·{' '}
      {item.params.content_type ?? 'text/plain'}
    </p>
  </section>
);

const ItemEditor: React.FC<{
  item: EditableItem;
  onChange: (item: EditableItem) => void;
}> = ({ item, onChange }) => {
  const intl = useIntl();
  const update = <Key extends keyof EditableItem>(
    key: Key,
    value: EditableItem[Key],
  ) => onChange({ ...item, [key]: value });
  return (
    <div className={classes.editor}>
      <label className={classes.wide}>
        <FormattedMessage {...messages.content} />
        <textarea
          rows={5}
          value={item.status}
          onChange={(event) => update('status', event.target.value)}
        />
      </label>
      <label className={classes.wide}>
        <FormattedMessage {...messages.contentWarning} />
        <input
          value={item.spoiler_text}
          onChange={(event) => update('spoiler_text', event.target.value)}
        />
      </label>
      <label>
        <FormattedMessage {...messages.visibility} />
        <select
          value={item.visibility}
          onChange={(event) =>
            update('visibility', event.target.value as StatusVisibility)
          }
        >
          <option value='public'>
            {intl.formatMessage({
              id: 'privacy.public.short',
              defaultMessage: 'Public',
            })}
          </option>
          <option value='unlisted'>
            {intl.formatMessage({
              id: 'privacy.unlisted.short',
              defaultMessage: 'Quiet public',
            })}
          </option>
          <option value='private'>
            {intl.formatMessage({
              id: 'privacy.private.short',
              defaultMessage: 'Followers',
            })}
          </option>
          <option value='direct'>
            {intl.formatMessage({
              id: 'privacy.direct.short',
              defaultMessage: 'Private mention',
            })}
          </option>
        </select>
      </label>
      <label>
        <FormattedMessage {...messages.language} />
        <input
          value={item.language}
          placeholder='pt'
          onChange={(event) => update('language', event.target.value)}
        />
      </label>
      <label>
        <FormattedMessage {...messages.format} />
        <select
          value={item.content_type}
          onChange={(event) => update('content_type', event.target.value)}
        >
          <option value='text/plain'>Plain text</option>
          <option value='text/markdown'>Markdown</option>
        </select>
      </label>
      <label>
        <input
          type='checkbox'
          checked={item.sensitive}
          onChange={(event) => update('sensitive', event.target.checked)}
        />
        <FormattedMessage
          id='scheduled_publications.sensitive'
          defaultMessage='Sensitive media'
        />
      </label>
      {Object.entries(item.media_alt).map(([id, alt]) => (
        <label className={classes.wide} key={id}>
          <FormattedMessage {...messages.alt} /> · {id}
          <input
            value={alt}
            onChange={(event) =>
              update('media_alt', {
                ...item.media_alt,
                [id]: event.target.value,
              })
            }
          />
        </label>
      ))}
    </div>
  );
};

const updateMediaAlt = async (item: EditableItem) => {
  await Promise.all(
    Object.entries(item.media_alt).map(([id, description]) =>
      api().put(`/api/v1/media/${id}`, { description }),
    ),
  );
};

// eslint-disable-next-line import/no-default-export
export default ScheduledPublications;
