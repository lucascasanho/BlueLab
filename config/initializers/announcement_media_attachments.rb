# frozen_string_literal: true

Rails.application.config.to_prepare do
  MediaAttachment.belongs_to :announcement, optional: true

  MediaAttachment.scope :attached, lambda {
    where.not(status_id: nil)
      .or(where.not(scheduled_status_id: nil))
      .or(where.not(announcement_id: nil))
  }

  MediaAttachment.scope :unattached, lambda {
    where(status_id: nil, scheduled_status_id: nil, announcement_id: nil)
  }
end
