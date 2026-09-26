# frozen_string_literal: true

class Auth::AccountSwitcherController < ApplicationController
  before_action :authenticate_user!

  def authenticate
    target_user = find_target_user

    unless valid_target_credentials?(target_user)
      return redirect_to(
        new_user_session_path(account_switcher: '1'),
        alert: I18n.t('devise.failure.invalid')
      )
    end

    if target_user.two_factor_enabled?
      if target_user.otp_required_for_login? && params.dig(:user, :otp_attempt).present?
        return complete_otp_authentication(target_user)
      end

      if target_user.otp_required_for_login?
        session[:account_switcher_attempt_user_id] = target_user.id
        session[:account_switcher_attempt_user_updated_at] = target_user.updated_at.to_s

        return redirect_to auth_account_switcher_two_factor_path
      end

      return redirect_to(
        new_user_session_path(account_switcher: '1'),
        alert: I18n.t('auth.sign_in.another_account.passkey_only')
      )
    end

    activate_account_session(target_user)
    redirect_to root_path
  end

  def two_factor
    target_user = pending_target_user

    return redirect_to(new_user_session_path(account_switcher: '1'), alert: I18n.t('devise.failure.timeout')) unless target_user

    self.resource = target_user if respond_to?(:resource=)
    @webauthn_enabled = target_user.webauthn_enabled?
    @scheme_type = 'totp'

    render 'auth/account_switcher/two_factor', layout: 'auth'
  end

  def switch
    activation = SessionActivation.includes(:user).find_by(session_id: params[:session_id].to_s)

    return head :not_found unless activation
    return head :forbidden unless activation.user&.active_for_authentication?
    return head :forbidden unless activation.user&.functional?

    cookies.signed['_session_id'] = {
      value: activation.session_id,
      expires: 1.year.from_now,
      httponly: true,
      same_site: :lax,
    }

    render json: {
      ok: true,
      account_id: activation.user.account_id.to_s,
    }
  end

  private

  def find_target_user
    email = params.dig(:user, :email).to_s.strip

    if Devise.ldap_authentication
      user = User.authenticate_with_ldap(params.expect(user: [:email, :password]))
      return user if user
    end

    if Devise.pam_authentication
      user = User.authenticate_with_pam(params.expect(user: [:email, :password]))
      return user if user
    end

    User.find_for_authentication(email: email)
  end

  def valid_target_credentials?(user)
    return false unless user&.active_for_authentication?
    return false unless user&.functional?

    user.valid_password?(params.dig(:user, :password).to_s)
  end

  def pending_target_user
    user_id = session[:account_switcher_attempt_user_id]
    updated_at = session[:account_switcher_attempt_user_updated_at]

    return unless user_id.present? && updated_at.present?

    user = User.find_by(id: user_id)

    return unless user&.active_for_authentication?
    return unless user.functional?
    return unless user.updated_at.to_s == updated_at

    user
  end

  def complete_otp_authentication(user)
    otp_attempt = params.dig(:user, :otp_attempt).to_s

    unless user.validate_and_consume_otp!(otp_attempt) || user.invalidate_otp_backup_code!(otp_attempt)
      return redirect_to(
        auth_account_switcher_two_factor_path,
        alert: I18n.t('users.invalid_otp_token')
      )
    end

    session.delete(:account_switcher_attempt_user_id)
    session.delete(:account_switcher_attempt_user_updated_at)

    activate_account_session(user)
    redirect_to root_path
  rescue OpenSSL::Cipher::CipherError
    redirect_to auth_account_switcher_two_factor_path, alert: I18n.t('users.invalid_otp_token')
  end

  def activate_account_session(user)
    session_id = user.activate_session(request)

    cookies.signed['_session_id'] = {
      value: session_id,
      expires: 1.year.from_now,
      httponly: true,
      same_site: :lax,
    }
  end
end
