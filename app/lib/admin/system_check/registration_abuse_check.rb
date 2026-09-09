# frozen_string_literal: true

class Admin::SystemCheck::RegistrationAbuseCheck < Admin::SystemCheck::BaseCheck
  include RoutingHelper

  ALERT_THRESHOLD = 10
  WINDOW = 24.hours

  def skip?
    !current_user.can?(:manage_users)
  end

  def pass?
    recent_unconfirmed_count < ALERT_THRESHOLD
  end

  def message
    Admin::SystemCheck::Message.new(
      :registration_abuse_check,
      recent_unconfirmed_count,
      admin_accounts_path(status: 'unconfirmed')
    )
  end

  private

  def recent_unconfirmed_count
    @recent_unconfirmed_count ||= User.unconfirmed.where(created_at: WINDOW.ago..).count
  end
end
