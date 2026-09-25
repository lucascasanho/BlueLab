# frozen_string_literal: true

class BugReport < ApplicationRecord
  include Paginable
  include RateLimitable

  MAX_DESCRIPTION_LENGTH = 5_000
  MAX_ATTACHMENTS = 5
  MAX_CLIENT_ERRORS = 20

  rate_limit by: :account, family: :bug_reports

  enum :status, { open: 0, resolved: 1 }

  belongs_to :account
  belongs_to :assigned_account, class_name: 'Account', optional: true
  belongs_to :resolved_by_account, class_name: 'Account', optional: true

  has_many :media_attachments, inverse_of: :bug_report, dependent: :destroy

  validates :description, presence: true, length: { maximum: MAX_DESCRIPTION_LENGTH }

  scope :recent, -> { order(id: :desc) }
  scope :unresolved, -> { where(status: :open) }
  scope :resolved, -> { where(status: :resolved) }

  def resolve!(account)
    update!(
      status: :resolved,
      resolved_at: Time.current,
      resolved_by_account: account
    )
  end

  def reopen!
    update!(
      status: :open,
      resolved_at: nil,
      resolved_by_account: nil
    )
  end
end
