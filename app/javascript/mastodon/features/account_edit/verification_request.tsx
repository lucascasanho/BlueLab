import { useCallback, useEffect, useId, useState } from 'react';
import type { FC, FormEvent, MouseEvent } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { apiGetVerificationRequestStatus, apiSubmitVerificationRequest } from '@/mastodon/api/verification';
import { Button } from '@/mastodon/components/button';
import { TextAreaField } from '@/mastodon/components/form_fields';
import { Popover } from '@/mastodon/components/popover';

import editClasses from './styles.module.scss';
import classes from './verification_request.module.scss';

const messages = defineMessages({
  trigger: {
    id: 'account_edit.verification.request_button',
    defaultMessage: 'Request verification badge',
  },
  title: {
    id: 'account_edit.verification.popover.title',
    defaultMessage: 'Request verification badge',
  },
  description: {
    id: 'account_edit.verification.popover.description',
    defaultMessage:
      'The BlueLab verification badge is granted according to internal criteria defined by moderation.',
  },
  free: {
    id: 'account_edit.verification.popover.free',
    defaultMessage:
      'The badge is completely free. You do not need to submit personal documents.',
  },
  criteria: {
    id: 'account_edit.verification.popover.criteria',
    defaultMessage:
      'The criteria are internal and defined by the moderation team.',
  },
  federation: {
    id: 'account_edit.verification.popover.federation',
    defaultMessage:
      'The badge is not compatible with all federation setups or Mastodon client apps. It is limited to instances using the BlueLab fork and to the web version.',
  },
  disclaimer: {
    id: 'account_edit.verification.popover.disclaimer',
    defaultMessage:
      'This badge is not affiliated with or endorsed by Mastodon GmbH. You can submit another request after 30 days.',
  },
  explanationLabel: {
    id: 'account_edit.verification.popover.explanation_label',
    defaultMessage: 'Message to moderation',
  },
  explanationHint: {
    id: 'account_edit.verification.popover.explanation_hint',
    defaultMessage:
      'You can send the request without a message. Maximum 5,000 characters.',
  },
  submit: {
    id: 'account_edit.verification.popover.submit',
    defaultMessage: 'Submit request',
  },
  cancel: {
    id: 'account_edit.verification.popover.cancel',
    defaultMessage: 'Cancel',
  },
  error: {
    id: 'account_edit.verification.popover.error',
    defaultMessage:
      'We could not send your verification request. Please try again.',
  },
});

export const VerificationRequestTrigger: FC = () => {
  const intl = useIntl();
  const [canRequest, setCanRequest] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState(false);
  const [triggerElement, setTriggerElement] =
    useState<HTMLButtonElement | null>(null);
  const uniqueId = useId();
  const popoverId =
    'bluelab-verification-request-' + uniqueId.replace(/:/g, '');

  const loadEligibility = useCallback(async () => {
    try {
      const result = await apiGetVerificationRequestStatus();
      setCanRequest(result.can_request);
    } catch {
      setCanRequest(false);
    }
  }, []);

  useEffect(() => {
    void loadEligibility();
  }, [loadEligibility]);

  const handleClose = useCallback(() => {
    if (!submitting) {
      setOpen(false);
      setError(false);
    }
  }, [submitting]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitting(true);
      setError(false);

      try {
        await apiSubmitVerificationRequest(explanation);
        setCanRequest(false);
        setExplanation('');
        setOpen(false);
      } catch {
        setError(true);
      } finally {
        setSubmitting(false);
      }
    },
    [explanation],
  );

  const handleTrigger = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setError(false);
      setTriggerElement(event.currentTarget);
      setOpen(true);
    },
    [],
  );

  if (!canRequest) {
    return null;
  }

  return (
    <>
      <Button
        className={editClasses.editButton}
        type='button'
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={handleTrigger}
      >
        {intl.formatMessage(messages.trigger)}
      </Button>

      <Popover
        isOpen={open}
        reference={triggerElement}
        onClose={handleClose}
        placement='bottom-end'
        offset={8}
        constrainToViewport
        scrollable
      >
        {({ props }) => (
          <div
            {...props}
            id={popoverId}
            role='dialog'
            aria-labelledby={popoverId + '-title'}
            className={'dropdown-animation ' + classes.popover}
          >
            <h3 id={popoverId + '-title'} className={classes.title}>
              <FormattedMessage {...messages.title} />
            </h3>
            <p className={classes.description}>
              <FormattedMessage {...messages.description} />
            </p>
            <p className={classes.notice}>
              <FormattedMessage {...messages.free} />
            </p>
            <p className={classes.notice}>
              <FormattedMessage {...messages.criteria} />
            </p>
            <p className={classes.notice}>
              <FormattedMessage {...messages.federation} />
            </p>
            <p className={classes.notice}>
              <FormattedMessage {...messages.disclaimer} />
            </p>

            <form className={classes.form} onSubmit={handleSubmit}>
              <TextAreaField
                id={popoverId + '-explanation'}
                label={intl.formatMessage(messages.explanationLabel)}
                hint={intl.formatMessage(messages.explanationHint)}
                value={explanation}
                maxLength={5_000}
                rows={6}
                required={false}
                onChange={(event) => setExplanation(event.target.value)}
              />

              {error && (
                <p className={classes.error} role='alert'>
                  <FormattedMessage {...messages.error} />
                </p>
              )}

              <div className={classes.actions}>
                <Button type='button' secondary onClick={handleClose}>
                  <FormattedMessage {...messages.cancel} />
                </Button>
                <Button type='submit' loading={submitting}>
                  <FormattedMessage {...messages.submit} />
                </Button>
              </div>
            </form>
          </div>
        )}
      </Popover>
    </>
  );
};
