# frozen_string_literal: true

# See also: USERNAME_RE in the Account class

class UniqueUsernameValidator < ActiveModel::Validator
  def validate(account)
    return if account.username.blank?

    scope = Account.with_username(account.username).with_domain(account.domain)
    scope = scope.where.not(id: account.id) if account.persisted?

    account.errors.add(:username, :taken) if scope.exists?

    return unless account.local? && defined?(AccountUsernameReservation)

    reservation = AccountUsernameReservation.find_by('lower(username) = lower(?)', account.username)
    account.errors.add(:username, :reserved) if reservation.present? && reservation.account_id != account.id
  end
end
