# frozen_string_literal: true

class Settings::UsernameChangesController < Settings::BaseController
  before_action :set_username_change

  def show; end

  def update
    @username_change.assign_attributes(username_change_params)

    if @username_change.valid?
      old_username = AccountUsernameChangeService.new.call(
        current_user,
        username: @username_change.username,
        current_password: @username_change.current_password
      )
      redirect_to settings_username_change_path, notice: t('settings.username_changes.success', old_username:, new_username: current_account.reload.username)
    else
      render :show, status: 422
    end
  rescue AccountUsernameChangeService::Error => e
    @username_change.errors.add(:base, error_message(e))
    render :show, status: 422
  end

  private

  def set_username_change
    @username_change = Form::UsernameChange.new
    @previous_reservation = current_account.username_reservations.historical.recent_first.first
    @last_changed_at = @previous_reservation&.relinquished_at
    @available_at = @last_changed_at && (@last_changed_at + AccountUsernameChangeService::COOLDOWN)
    @cooldown_active = @available_at.present? && @available_at.future?
    @eligible = current_user.functional? && current_user.encrypted_password.present? && current_account.local? && current_account.numeric_ap_id? && (current_account.actor_type.blank? || current_account.actor_type == 'Person')
  end

  def username_change_params
    params.expect(form_username_change: [:username, :current_password, :confirmation])
  end

  def error_message(error)
    options = error.available_at ? { date: helpers.l(error.available_at, format: :long) } : {}
    t("settings.username_changes.errors.#{error.code}", **options)
  end
end
