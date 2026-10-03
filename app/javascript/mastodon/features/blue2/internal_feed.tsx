import { useEffect } from 'react';
import type React from 'react';

import { FormattedMessage } from 'react-intl';

import {
  connectHashtagStream,
  connectListStream,
  connectPublicStream,
  connectUserStream,
} from '@/mastodon/actions/streaming';
import {
  expandHashtagTimeline,
  expandHomeTimeline,
  expandListTimeline,
  expandPublicTimeline,
} from '@/mastodon/actions/timelines';
import { Column } from '@/mastodon/components/column';
import StatusListContainer from '@/mastodon/features/ui/containers/status_list_container';
import { useAppDispatch } from '@/mastodon/store';

export interface Blue2InternalFeedProps {
  type: 'home' | 'global' | 'list' | 'hashtag';
  id?: string;
}

export const Blue2InternalFeed: React.FC<Blue2InternalFeedProps> = ({
  type,
  id,
}) => {
  const dispatch = useAppDispatch();

  const timelineId =
    type === 'home'
      ? 'home'
      : type === 'global'
        ? 'public'
        : type === 'list'
          ? `list:${id ?? ''}`
          : `hashtag:${id ?? ''}`;

  useEffect(() => {
    if (type === 'home') {
      dispatch(expandHomeTimeline());
      return dispatch(connectUserStream());
    }

    if (type === 'global') {
      dispatch(expandPublicTimeline());
      return dispatch(connectPublicStream());
    }

    if (!id) {
      return undefined;
    }

    if (type === 'list') {
      dispatch(expandListTimeline(id));
      return dispatch(connectListStream(id));
    }

    dispatch(expandHashtagTimeline(id, { local: false }));
    return dispatch(connectHashtagStream(id, id, false));
  }, [dispatch, id, type]);

  const handleLoadMore = (maxId: number) => {
    if (type === 'global') {
      dispatch(expandPublicTimeline({ maxId }));
    } else if (type === 'home') {
      dispatch(expandHomeTimeline({ maxId }));
    } else if (type === 'list' && id) {
      dispatch(expandListTimeline(id, { maxId }));
    } else if (type === 'hashtag' && id) {
      dispatch(expandHashtagTimeline(id, { maxId, local: false }));
    }
  };

  return (
    <Column bindToDocument>
      <StatusListContainer
        trackScroll
        scrollKey={`blue2-internal-${timelineId}`}
        timelineId={timelineId}
        onLoadMore={handleLoadMore}
        emptyMessage={
          type === 'home' ? (
            <FormattedMessage
              id='empty_column.home'
              defaultMessage='Your home timeline is empty!'
            />
          ) : type === 'global' ? (
            <FormattedMessage
              id='empty_column.public'
              defaultMessage='The global timeline is empty!'
            />
          ) : type === 'list' ? (
            <FormattedMessage
              id='empty_column.list'
              defaultMessage='There is nothing in this list yet.'
            />
          ) : (
            <FormattedMessage
              id='empty_column.hashtag'
              defaultMessage='There is nothing in this hashtag yet.'
            />
          )
        }
        bindToDocument
      />
    </Column>
  );
};
