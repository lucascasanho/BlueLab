# frozen_string_literal: true

# A single source of truth for current and former local usernames. Keeping
# current usernames here as well as historical ones lets PostgreSQL prevent a
# registration from racing with a username change.
class AccountUsernameReservation < ApplicationRecord
  belongs_to :account, inverse_of: :username_reservations, optional: true

  validates :username, presence: true, format: { with: /\A[a-z0-9_]+\z/i }, length: { maximum: Account::USERNAME_LENGTH_LIMIT }
  validates :username, uniqueness: { case_sensitive: false }

  scope :current, -> { where(relinquished_at: nil) }
  scope :historical, -> { where.not(relinquished_at: nil) }
  scope :recent_first, -> { order(relinquished_at: :desc, id: :desc) }

  normalizes :username, with: ->(username) { username.squish }
end
