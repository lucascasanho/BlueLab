# frozen_string_literal: true

# A durable coordinator for a sequence of native ScheduledStatus records.
# Individual scheduled posts continue to use Mastodon's upstream path unchanged.
class ScheduledThread < ApplicationRecord
  include Paginable

  STATES = %w(pending publishing failed).freeze

  belongs_to :account, inverse_of: :scheduled_threads
  has_many :scheduled_statuses, -> { order(:thread_position) }, inverse_of: :scheduled_thread, dependent: :destroy

  validates :state, inclusion: { in: STATES }
  validates :scheduled_at, presence: true
  validates :idempotency_key, uniqueness: { scope: :account_id }, allow_nil: true
  validate :validate_future_date

  scope :due, -> { where(state: STATES).where(scheduled_at: ..Time.now.utc).where('next_retry_at IS NULL OR next_retry_at <= ?', Time.now.utc) }

  def retryable?
    state == 'failed'
  end

  private

  def validate_future_date
    return unless new_record? || will_save_change_to_scheduled_at?
    return if scheduled_at.blank? || scheduled_at > Time.now.utc + ScheduledStatus::MINIMUM_OFFSET

    errors.add(:scheduled_at, I18n.t('scheduled_statuses.too_soon'))
  end
end
