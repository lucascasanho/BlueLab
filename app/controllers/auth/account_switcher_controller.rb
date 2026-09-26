# frozen_string_literal: true

class Auth::AccountSwitcherController < ApplicationController
  before_action :authenticate_user!

  def switch
    user = user_for_token

    return head :not_found unless user
    return head :forbidden unless user.active_for_authentication?
    return head :forbidden unless user.functional?

    # Preserve the currently active SessionActivation while replacing the
    # Warden user and browser session with the target account.
    session[:account_switcher] = true
    warden.logout(:user) if warden.authenticated?(:user)

    session_id = user.activate_session(request)

    cookies.signed['_session_id'] = {
      value: session_id,
      expires: 1.year.from_now,
      httponly: true,
      same_site: :lax,
    }

    session.delete(:account_switcher)

    render json: {
      ok: true,
      account_id: user.account_id.to_s,
    }
  end

  private

  def user_for_token
    token = params[:token].to_s
    return if token.blank?

    access_token = Doorkeeper::AccessToken.find_by(token: token)
    return if access_token.nil? || access_token.revoked_at.present?
    return unless access_token.application&.superapp?

    access_token.resource_owner
  end
end
