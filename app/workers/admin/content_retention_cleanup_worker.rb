# frozen_string_literal: true

class Admin::ContentRetentionCleanupWorker
  include Sidekiq::Worker

  REMOTE_MEDIA_RETENTION_PERIOD = 14.days.freeze

  sidekiq_options retry: 3, lock: :until_executed, lock_ttl: 1.day.to_i

  def perform
    cutoff = REMOTE_MEDIA_RETENTION_PERIOD.ago

    clear_attachment_batches(
      MediaAttachment.remote.cached.created_before(cutoff).updated_before(cutoff),
      MediaAttachment,
      'remote media attachments'
    )
    clear_attachment_batches(
      PreviewCard.cached.where(type: :link),
      PreviewCard,
      'link preview cards'
    )
  end

  private

  def clear_attachment_batches(scope, model, label)
    scope.find_in_batches do |records|
      AttachmentBatch.new(model, records).clear
    rescue => e
      Rails.logger.error("Skipping batch while manually clearing #{label} due to error: #{e}")
    end
  end
end
