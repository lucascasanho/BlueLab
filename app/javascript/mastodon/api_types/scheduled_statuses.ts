import type { ApiMediaAttachmentJSON } from './media_attachments';
import type { StatusVisibility } from './statuses';

export interface ApiScheduledStatusParams {
  text: string;
  spoiler_text?: string | null;
  sensitive?: boolean | null;
  visibility?: StatusVisibility | null;
  language?: string | null;
  content_type?: string | null;
  media_ids?: string[] | null;
  in_reply_to_id?: string | null;
  quoted_status_id?: string | null;
  quote_approval_policy?: string | null;
}

export interface ApiScheduledStatusJSON {
  id: string;
  scheduled_at: string;
  published_status_id: string | null;
  params: ApiScheduledStatusParams;
  media_attachments: ApiMediaAttachmentJSON[];
}

export interface ApiScheduledThreadJSON {
  id: string;
  scheduled_at: string;
  state: 'pending' | 'publishing' | 'failed';
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  published_status_ids: string[];
  items: ApiScheduledStatusJSON[];
}
