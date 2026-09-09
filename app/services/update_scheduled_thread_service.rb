# frozen_string_literal: true

class UpdateScheduledThreadService < BaseService
  def call(scheduled_thread, application:, items: nil, scheduled_at: nil)
    scheduled_thread.with_lock do
      already_started = scheduled_thread.scheduled_statuses.where.not(published_status_id: nil).exists?
      raise Mastodon::ValidationError, I18n.t('scheduled_threads.errors.already_started') if already_started

      ApplicationRecord.transaction do
        scheduled_thread.update!(
          scheduled_at: scheduled_at || scheduled_thread.scheduled_at,
          state: 'pending',
          attempts: 0,
          next_retry_at: nil,
          last_error: nil
        )

        if items
          validate_items!(items)
          replace_items!(scheduled_thread, items, application)
        end

        scheduled_thread.scheduled_statuses.update_all(scheduled_at: scheduled_thread.scheduled_at)
      end
    end

    scheduled_thread.reload
  end

  private

  def validate_items!(items)
    return if items.size.between?(CreateScheduledThreadService::MIN_ITEMS, CreateScheduledThreadService::MAX_ITEMS)

    raise Mastodon::ValidationError, I18n.t('scheduled_threads.errors.item_count', min: CreateScheduledThreadService::MIN_ITEMS, max: CreateScheduledThreadService::MAX_ITEMS)
  end

  def replace_items!(scheduled_thread, items, application)
    scheduled_thread.scheduled_statuses.each do |scheduled_status|
      scheduled_status.media_attachments.update_all(scheduled_status_id: nil)
      scheduled_status.destroy!
    end

    items.each_with_index do |item, position|
      scheduled_status = PostStatusService.new.call(
        scheduled_thread.account,
        item.merge(
          scheduled_at: scheduled_thread.scheduled_at,
          application: application,
          idempotency: nil,
          with_rate_limit: true
        )
      )
      scheduled_status.update!(scheduled_thread: scheduled_thread, thread_position: position)
    end
  end
end
