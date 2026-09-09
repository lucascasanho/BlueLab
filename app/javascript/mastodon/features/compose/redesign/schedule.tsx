/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- Escape dismisses the non-modal schedule control group and restores trigger focus. */
import { useCallback, useRef, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { CalendarDotsIcon, XIcon } from '@phosphor-icons/react';

import { changeComposeSchedule } from '@/mastodon/actions/compose';
import { Button, IconButton } from '@/mastodon/components/button/redesign';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';

import classes from './styles.module.scss';

const messages = defineMessages({
  schedule: {
    id: 'compose.schedule.open',
    defaultMessage: 'Schedule publication',
  },
  remove: {
    id: 'compose.schedule.remove',
    defaultMessage: 'Remove schedule and publish immediately',
  },
});

const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const localValue = (iso: string | null, timezone: string) => {
  const date = iso ? new Date(iso) : new Date(Date.now() + 10 * 60_000);
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};

const timezoneOffset = (timestamp: number, timezone: string) => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, Number(part.value)]),
  );
  return (
    Date.UTC(
      values.year ?? NaN,
      (values.month ?? NaN) - 1,
      values.day ?? NaN,
      values.hour ?? NaN,
      values.minute ?? NaN,
      values.second ?? NaN,
    ) - timestamp
  );
};

export const scheduledIso = (value: string, timezone: string) => {
  const [date = '', time = ''] = value.split('T');
  const [year = NaN, month = NaN, day = NaN] = date.split('-').map(Number);
  const [hour = NaN, minute = NaN] = time.split(':').map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = wallClock - timezoneOffset(wallClock, timezone);
  timestamp = wallClock - timezoneOffset(timestamp, timezone);
  if (Number.isNaN(timestamp)) return null;

  return new Date(timestamp).toISOString();
};

const supportedTimezones = () => {
  const method: unknown = Reflect.get(Intl, 'supportedValuesOf');
  const zones =
    typeof method === 'function'
      ? (Reflect.apply(method, Intl, ['timeZone']) as string[])
      : [];
  return Array.from(new Set([browserTimezone(), 'UTC', ...zones]));
};

export const ComposeSchedule: React.FC = () => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const rootRef = useRef<HTMLDivElement>(null);
  const scheduledAt = useAppSelector(
    (state) => state.compose.get('scheduled_at') as string | null,
  );
  const savedTimezone = useAppSelector(
    (state) => state.compose.get('scheduled_timezone') as string | null,
  );
  const hasPublishedThreadItems = useAppSelector(
    (state) =>
      !(
        state.compose.get('thread_published_ids') as unknown as {
          isEmpty: () => boolean;
        }
      ).isEmpty(),
  );
  const [timezone, setTimezone] = useState(savedTimezone ?? browserTimezone());
  const [timezones] = useState(() => supportedTimezones());
  const [open, setOpen] = useState(false);
  const [dateTime, setDateTime] = useState(() =>
    localValue(scheduledAt, timezone),
  );
  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus(),
    );
  }, []);

  const apply = useCallback(() => {
    const value = scheduledIso(dateTime, timezone);
    if (!value) return;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;
    dispatch(changeComposeSchedule(parsed.toISOString(), timezone));
    closeAndRestoreFocus();
  }, [closeAndRestoreFocus, dateTime, dispatch, timezone]);

  const remove = useCallback(() => {
    dispatch(changeComposeSchedule(null, null));
    closeAndRestoreFocus();
  }, [closeAndRestoreFocus, dispatch]);
  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);
  const changeDateTime: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setDateTime(event.target.value);
    }, []);
  const changeTimezone: React.ChangeEventHandler<HTMLSelectElement> =
    useCallback((event) => {
      setTimezone(event.target.value);
    }, []);
  const panelKeyDown: React.KeyboardEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeAndRestoreFocus();
    },
    [closeAndRestoreFocus],
  );

  return (
    <div ref={rootRef} className={classes.scheduleControl}>
      <IconButton
        size='sm'
        icon={CalendarDotsIcon}
        color={scheduledAt ? 'accent' : 'neutral'}
        aria-expanded={open}
        title={intl.formatMessage(messages.schedule)}
        disabled={hasPublishedThreadItems}
        onClick={toggle}
      >
        <FormattedMessage {...messages.schedule} />
      </IconButton>
      {open && (
        <div
          className={classes.schedulePanel}
          role='group'
          aria-label={intl.formatMessage(messages.schedule)}
          onKeyDown={panelKeyDown}
        >
          <label>
            <FormattedMessage
              id='compose.schedule.date_time'
              defaultMessage='Date and time'
            />
            <input
              type='datetime-local'
              value={dateTime}
              onChange={changeDateTime}
            />
          </label>
          <label className={classes.scheduleTimezone}>
            <FormattedMessage
              id='compose.schedule.timezone'
              defaultMessage='Timezone'
            />
            <select value={timezone} onChange={changeTimezone}>
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <div className={classes.scheduleActions}>
            {scheduledAt && (
              <Button size='sm' leadingIcon={XIcon} onClick={remove}>
                <FormattedMessage {...messages.remove} />
              </Button>
            )}
            <Button size='sm' variant='solid' color='accent' onClick={apply}>
              <FormattedMessage
                id='compose.schedule.confirm'
                defaultMessage='Confirm schedule'
              />
            </Button>
          </div>
        </div>
      )}
      {scheduledAt && (
        <span className={classes.scheduledSummary}>
          <FormattedMessage
            id='compose.schedule.summary'
            defaultMessage='Scheduled for {date}'
            values={{
              date: new Intl.DateTimeFormat(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: timezone,
              }).format(new Date(scheduledAt)),
            }}
          />
        </span>
      )}
    </div>
  );
};
