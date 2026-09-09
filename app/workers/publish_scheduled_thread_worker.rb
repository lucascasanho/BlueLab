# frozen_string_literal: true

class PublishScheduledThreadWorker
  include Sidekiq::Worker

  sidekiq_options retry: 10, lock: :until_executed, lock_ttl: 1.hour.to_i

  def perform(scheduled_thread_id)
    scheduled_thread = ScheduledThread.find(scheduled_thread_id)
    PublishScheduledThreadService.new.call(scheduled_thread)
  rescue ActiveRecord::RecordNotFound
    true
  rescue => e
    record_failure(scheduled_thread_id, e)
    raise
  end

  private

  def record_failure(scheduled_thread_id, error)
    scheduled_thread = ScheduledThread.find_by(id: scheduled_thread_id)
    return unless scheduled_thread

    attempts = scheduled_thread.attempts + 1
    delay = [2**attempts, 60].min.minutes
    scheduled_thread.update_columns(
      state: 'failed',
      attempts: attempts,
      next_retry_at: Time.now.utc + delay,
      last_error: error.message.to_s.truncate(2_000),
      updated_at: Time.now.utc
    )
  end
end
