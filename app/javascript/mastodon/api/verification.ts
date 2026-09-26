import {
  apiRequestGet,
  apiRequestPatch,
  apiRequestPost,
} from 'mastodon/api';

export interface ApiVerificationRequestStatus {
  can_request: boolean;
  reason:
    | 'available'
    | 'verified'
    | 'restricted'
    | 'pending'
    | 'cooldown'
    | 'unavailable';
  next_request_at: string | null;
}

export interface ApiVerificationRequestResult {
  id: string;
  created_at: string;
}

export interface ApiVerificationBadgeResult {
  verified_badge_visible: boolean;
}

export const apiGetVerificationRequestStatus = () =>
  apiRequestGet<ApiVerificationRequestStatus>(
    'v1/profile/verification_request',
  );

export const apiSubmitVerificationRequest = (text: string) =>
  apiRequestPost<ApiVerificationRequestResult>(
    'v1/profile/verification_request',
    { text },
  );

export const apiUpdateVerificationBadge = (visible: boolean) =>
  apiRequestPatch<ApiVerificationBadgeResult>(
    'v1/profile/verification_badge',
    { visible },
  );
