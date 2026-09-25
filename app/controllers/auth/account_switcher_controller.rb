# frozen_string_literal: true

class Auth::AccountSwitcherController < ApplicationController
  before_action :authenticate_user!

  def switch
    user = user_for_token

    return head :not_found unless user
    return head :forbidden unless user.active_for_authentication?
    return head :forbidden unless user.functional?

    # A previously created web session may have been removed since the
    # account was last used. The account-switcher credential is tied to the
    # account's OAuth access token, so issue a fresh browser session instead of
    # depending on an old SessionActivation record.
    session_id = user.activate_session(request)

    cookies.signed['_session_id'] = {
      value: session_id,
      expires: 1.year.from_now,
      httponly: true,
      same_site: :lax,
    }

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

    access_token.resource_owner
  end
end
