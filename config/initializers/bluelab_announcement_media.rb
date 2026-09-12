# frozen_string_literal: true

# Keep announcement media support isolated from Mastodon's upstream
# MediaAttachment model. This makes communication attachments count as attached
# media so the regular orphan cleanup cannot remove them.
Rails.application.config.to_prepare do
  unless MediaAttachment.reflect_on_association(:announcement)
    MediaAttachment.belongs_to :announcement, inverse_of: :media_attachments, optional: true
  end

  MediaAttachment.scope :attached, lambda {
    where.not(status_id: nil)
      .or(where.not(scheduled_status_id: nil))
      .or(where.not(announcement_id: nil))
  }

  MediaAttachment.scope :unattached, lambda {
    where(status_id: nil, scheduled_status_id: nil, announcement_id: nil)
  }
end
