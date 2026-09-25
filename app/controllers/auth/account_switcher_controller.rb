# frozen_string_literal: true

class Auth::AccountSwitcherController < ApplicationController
  before_action :authenticate_user!

  def switch
    activation = session_activation_for_token

    return head :not_found unless activation
    return head :forbidden unless activation.user&.active_for_authentication?
    return head :forbidden unless activation.user.functional?

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

  def session_activation_for_token
    token = params[:token].to_s
    return if token.blank?

    access_token = Doorkeeper::AccessToken.find_by(token: token)
    return if access_token.nil? || access_token.revoked_at.present?

    SessionActivation.includes(:user).find_by(access_token_id: access_token.id)
  end
end
