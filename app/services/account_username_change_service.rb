# frozen_string_literal: true

class AccountUsernameChangeService < BaseService
  COOLDOWN = 15.days.freeze

  class Error < StandardError
    attr_reader :code, :available_at

    def initialize(code, available_at: nil)
      @code = code
      @available_at = available_at
      super(code.to_s)
    end
  end

  def call(user, username:, current_password:)
    @user = user
    @account = user.account
    @username = username.to_s.strip
    @current_password = current_password

    authenticate!
    ensure_eligible!

    old_username = change_username!
    invalidate_mention_cache!(old_username)
    ActivityPub::UpdateDistributionWorker.perform_async(@account.id)

    old_username
  rescue ActiveRecord::RecordNotUnique
    raise Error, :conflict
  end

  private

  def authenticate!
    raise Error, :password_unavailable if @user.encrypted_password.blank?
    raise Error, :invalid_password unless @user.valid_password?(@current_password)
  end

  def ensure_eligible!
    raise Error, :ineligible unless @account.local? && @user.functional?
    raise Error, :ineligible unless @account.actor_type.blank? || @account.actor_type == 'Person'
    raise Error, :incompatible_actor_id unless @account.numeric_ap_id?
  end

  def change_username!
    old_username = @account.username
    raise Error, :unchanged if old_username.casecmp(@username).zero?

    Account.transaction do
      @account.lock!
      current_reservation = @account.username_reservations.current.lock.first_or_create!(username: @account.username)
      previous_reservation = @account.username_reservations.historical.recent_first.lock.first
      enforce_cooldown!(previous_reservation)

      target_reservation = AccountUsernameReservation.lock.find_by('lower(username) = lower(?)', @username)
      raise Error, :reserved if target_reservation.present? && target_reservation.account_id != @account.id

      current_reservation.update!(relinquished_at: Time.now.utc)
      activate_reservation!(target_reservation)
      @account.update!(username: @username)
      record_audit_log!(old_username)
    end

    old_username
  rescue ActiveRecord::RecordInvalid => e
    raise Error, account_error_code(e.record)
  end

  def enforce_cooldown!(previous_reservation)
    return if previous_reservation.nil?

    available_at = previous_reservation.relinquished_at + COOLDOWN
    return if available_at <= Time.now.utc
    return if previous_reservation.username.casecmp(@username).zero?

    raise Error.new(:cooldown, available_at:)
  end

  def activate_reservation!(reservation)
    if reservation
      reservation.update!(relinquished_at: nil)
    else
      @account.username_reservations.create!(username: @username)
    end
  end

  def record_audit_log!(old_username)
    log = @account.action_logs.create!(
      action: :username_change,
      target: @account
    )
    log.update_column(:human_identifier, "@#{old_username} → @#{@username}")
  end

  def invalidate_mention_cache!(old_username)
    domains = [nil, Rails.configuration.x.local_domain, Rails.configuration.x.web_domain, *Rails.configuration.x.alternate_domains].uniq

    [old_username, @username].product(domains).each do |username, domain|
      EntityCache.instance.delete_mention(username, domain)
    end
  end

  def account_error_code(record)
    return :invalid if record.errors.of_kind?(:username, :invalid) || record.errors.of_kind?(:username, :too_long)
    return :reserved if record.errors.of_kind?(:username, :reserved) || record.errors.of_kind?(:username, :taken)

    :unexpected
  end
end
