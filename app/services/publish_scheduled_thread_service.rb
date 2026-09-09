# frozen_string_literal: true

class PublishScheduledThreadService < BaseService
  def call(scheduled_thread)
    scheduled_thread.with_lock do
      return scheduled_thread if scheduled_thread.scheduled_at.future? || scheduled_thread.next_retry_at&.future?

      if scheduled_thread.account.user_disabled?
        scheduled_thread.destroy!
        return nil
      end

      scheduled_thread.update!(state: 'publishing', last_error: nil, next_retry_at: nil)
    end

    publish_items!(scheduled_thread)
    scheduled_thread.destroy!
    nil
  end

  private

  def publish_items!(scheduled_thread)
    previous_status = nil

    scheduled_thread.scheduled_statuses.each do |item|
      item.reload
      if item.published_status_id?
        previous_status = item.published_status
        raise ActiveRecord::RecordNotFound, 'A previously-published thread item is unavailable' unless previous_status

        next
      end

      options = options_with_objects(item.params.with_indifferent_access)
      options[:thread] = previous_status if item.thread_position.positive?
      options[:idempotency] = "scheduled-thread:#{scheduled_thread.id}:#{item.id}"
      options[:with_rate_limit] = false

      ApplicationRecord.transaction do
        item.lock!
        if item.published_status_id?
          previous_status = item.published_status
          next
        end

        previous_status = PostStatusService.new.call(scheduled_thread.account, options)
        # A due ScheduledStatus cannot pass its creation-time future-date
        # validation anymore. Persist only this execution checkpoint so a
        # worker restart can safely resume at the next item.
        item.update_column(:published_status_id, previous_status.id)
      end
    end
  end

  def options_with_objects(options)
    options.tap do |values|
      values[:application] = Doorkeeper::Application.find(values.delete(:application_id)) if values[:application_id]
      values[:thread] = Status.find(values.delete(:in_reply_to_id)) if values[:in_reply_to_id]
      values[:quoted_status] = Status.find(values.delete(:quoted_status_id)) if values[:quoted_status_id]
    end
  end
end
