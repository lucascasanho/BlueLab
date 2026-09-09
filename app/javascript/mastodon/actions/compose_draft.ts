import { createAction } from '@reduxjs/toolkit';

import type { StatusVisibility } from '@/mastodon/api_types/statuses';

export interface PersistedComposeDraft {
  id: string | null;
  text: string;
  content_type: string;
  spoiler: boolean;
  spoiler_text: string;
  in_reply_to: string | null;
  privacy: StatusVisibility | null;
  sensitive: boolean;
  language: string;
  media_attachments: Record<string, unknown>[];
  poll: Record<string, unknown> | null;
  quoted_status_id: string | null;
  quote_policy: string;
  scheduled_at: string | null;
  scheduled_timezone: string | null;
  idempotency_key: string;
  thread_items: Record<string, unknown>[];
  thread_published_ids: Record<string, string>;
  thread_error_index: number | null;
}

export const restoreComposeDraft = createAction<PersistedComposeDraft>(
  'compose/draftRestore',
);
