# frozen_string_literal: true

class VerificationRequest < ApplicationRecord
  include Paginable

  EXPLANATION_LENGTH_LIMIT = 5_000
  REQUEST_COOLDOWN = 30.days.freeze

  enum :status, {
    pending: 0,
    approved: 1,
    denied: 2,
  }

  belongs_to :account
  belongs_to :resolved_by_account, class_name: 'Account', optional: true

  has_many :notifications, as: :activity, dependent: :destroy

  validates :explanation, length: { maximum: EXPLANATION_LENGTH_LIMIT }

  before_validation :normalize_explanation, on: :create
  after_create_commit :notify_moderators

  scope :recent, -> { order(created_at: :desc) }
  scope :unresolved, -> { pending }
  scope :resolved, -> { where.not(status: :pending) }

  class << self
    def eligibility_for(account)
      return [:unavailable, nil] unless account&.local? && account.user&.functional?
      return [:verified, nil] if account.user_role&.verified_by_instance?
      return [:restricted, nil] if account.silenced?

      latest = where(account:).recent.first
      return [:pending, nil] if latest&.pending?

      if latest.present?
        next_request_at = latest.created_at + REQUEST_COOLDOWN
        return [:cooldown, next_request_at] if next_request_at.future?
      end

      [:available, nil]
    end

    def requestable?(account)
      eligibility_for(account).first == :available
    end
  end

  def resolved?
    !pending?
  end

  def resolve!(account, status:)
    raise ArgumentError, 'Verification request is already resolved' unless pending?
    raise ArgumentError, 'Invalid verification request status' unless status.to_sym.in?(%i(approved denied))

    update!(
      status: status,
      resolved_by_account: account,
      resolved_at: Time.current
    )
  end

  def to_log_human_identifier
    id
  end

  private

  def normalize_explanation
    self.explanation = explanation.to_s.strip
  end

  def notify_moderators
    User.those_who_can(:manage_roles).includes(:account).find_each do |user|
      LocalNotificationWorker.perform_async(
        user.account_id,
        id,
        'VerificationRequest',
        'admin.verification_request'
      )
    end
  end
end
