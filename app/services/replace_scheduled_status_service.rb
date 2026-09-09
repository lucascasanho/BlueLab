# frozen_string_literal: true

class ReplaceScheduledStatusService < BaseService
  def call(scheduled_status, options:, application:)
    raise Mastodon::ValidationError, I18n.t('scheduled_threads.errors.use_thread_editor') if scheduled_status.scheduled_thread_id?

    replacement = nil
    scheduled_status.with_lock do
      ApplicationRecord.transaction do
        scheduled_status.media_attachments.update_all(scheduled_status_id: nil)
        scheduled_status.destroy!
        replacement = PostStatusService.new.call(
          scheduled_status.account,
          options.merge(
            scheduled_at: options[:scheduled_at] || scheduled_status.scheduled_at,
            application: application,
            idempotency: nil,
            with_rate_limit: true
          )
        )
      end
    end
    replacement
  end
end
