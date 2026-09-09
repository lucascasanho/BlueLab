# frozen_string_literal: true

class CreateScheduledThreadService < BaseService
  include Redisable
  include Lockable

  MIN_ITEMS = 2
  MAX_ITEMS = ScheduledStatus::DAILY_LIMIT

  def call(account, items:, scheduled_at:, application:, idempotency: nil)
    @account = account
    @items = items
    @scheduled_at = scheduled_at
    @application = application
    @idempotency = idempotency.presence

    validate_items!

    return create_thread! unless @idempotency

    with_redis_lock("idempotency:lock:scheduled-thread:#{@account.id}:#{@idempotency}") do
      @account.scheduled_threads.find_by(idempotency_key: @idempotency) || create_thread!
    end
  end

  private

  def validate_items!
    return if @items.size.between?(MIN_ITEMS, MAX_ITEMS)

    raise Mastodon::ValidationError, I18n.t('scheduled_threads.errors.item_count', min: MIN_ITEMS, max: MAX_ITEMS)
  end

  def create_thread!
    ApplicationRecord.transaction do
      thread = @account.scheduled_threads.create!(scheduled_at: @scheduled_at, idempotency_key: @idempotency)

      @items.each_with_index do |item, position|
        scheduled_status = PostStatusService.new.call(
          @account,
          item.merge(
            scheduled_at: thread.scheduled_at,
            application: @application,
            idempotency: nil,
            with_rate_limit: true
          )
        )
        scheduled_status.update!(scheduled_thread: thread, thread_position: position)
      end

      thread
    end
  rescue ActiveRecord::RecordNotUnique
    @account.scheduled_threads.find_by!(idempotency_key: @idempotency)
  end
end
