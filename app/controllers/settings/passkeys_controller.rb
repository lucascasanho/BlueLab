# frozen_string_literal: true

class Settings::PasskeysController < Settings::BaseController
  include ChallengableConcern

  CHALLENGE_TTL = 5.minutes.freeze

  skip_before_action :check_self_destruct!
  skip_before_action :require_functional!

  before_action :require_challenge!, only: [:new, :options, :destroy]

  def index; end
  def new; end

  def options
    current_user.update!(webauthn_id: WebAuthn.generate_user_id) if current_user.webauthn_id.blank?

    options = WebAuthn::Credential.options_for_create(
      user: {
        name: current_user.account.username,
        display_name: current_user.account.display_name.presence || current_user.account.username,
        id: current_user.webauthn_id,
      },
      exclude: current_user.webauthn_credentials.pluck(:external_id),
      authenticator_selection: {
        resident_key: 'required',
        user_verification: 'required',
      }
    )

    session[:passkey_registration_challenge] = {
      'challenge' => options.challenge,
      'issued_at' => Time.now.to_i,
    }

    render json: options
  end

  def create
    challenge = consume_registration_challenge!
    credential = WebAuthn::Credential.from_create(params[:credential])
    credential.verify(challenge, user_verification: true)

    passkey = current_user.webauthn_credentials.build(
      external_id: credential.id,
      public_key: credential.public_key,
      nickname: params[:nickname],
      sign_count: credential.sign_count,
      passkey: true
    )

    if passkey.save
      flash[:success] = t('passkeys.create.success')
      render json: { redirect_path: settings_passkeys_path }, status: 200
    else
      render json: { error: t('passkeys.create.error') }, status: 422
    end
  rescue WebAuthn::Error, PasskeyChallengeError, ActionController::ParameterMissing
    render json: { error: t('passkeys.create.error') }, status: 422
  end

  def destroy
    passkey = current_user.webauthn_credentials.passkeys.find_by(id: params[:id])

    if passkey&.destroy
      redirect_to settings_passkeys_path, flash: { success: t('passkeys.destroy.success') }
    else
      redirect_to settings_passkeys_path, flash: { error: t('passkeys.destroy.error') }
    end
  end

  private

  class PasskeyChallengeError < StandardError; end

  def consume_registration_challenge!
    state = session.delete(:passkey_registration_challenge)
    raise PasskeyChallengeError unless state.is_a?(Hash)
    raise PasskeyChallengeError if state['challenge'].blank? || state['issued_at'].to_i < CHALLENGE_TTL.ago.to_i

    state['challenge']
  end
end
