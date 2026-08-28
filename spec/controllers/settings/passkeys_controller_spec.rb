# frozen_string_literal: true

require 'rails_helper'
require 'webauthn/fake_client'

RSpec.describe Settings::PasskeysController do
  render_views

  let(:user) { Fabricate(:user) }
  let(:domain) { "#{Rails.configuration.x.use_https ? 'https' : 'http'}://#{Rails.configuration.x.web_domain}" }
  let(:fake_client) { WebAuthn::FakeClient.new(domain) }
  let(:challenge) { WebAuthn::Credential.options_for_create(user: { id: user.webauthn_id, name: user.account.username }).challenge }
  let(:credential) { fake_client.create(challenge: challenge, user_verified: true) }

  before do
    user.update!(webauthn_id: WebAuthn.generate_user_id)
    sign_in user, scope: :user
  end

  describe 'GET #options' do
    it 'requires a resident credential and user verification' do
      get :options, session: { challenge_passed_at: Time.now.utc }

      expect(response).to have_http_status(200)
      expect(response.parsed_body).to include(
        'authenticatorSelection' => include(
          'residentKey' => 'required',
          'userVerification' => 'required'
        )
      )
      expect(session[:passkey_registration_challenge]).to include('challenge' => be_present, 'issued_at' => be_present)
    end
  end

  describe 'POST #create' do
    it 'adds multiple passkeys without changing security keys' do
      security_key = Fabricate(:webauthn_credential, user_id: user.id)

      expect do
        post :create,
             params: { credential: credential, nickname: 'iPhone' },
             session: registration_session
      end.to change { user.webauthn_credentials.passkeys.count }.by(1)
        .and(not_change { user.webauthn_credentials.security_keys.count })

      second_client = WebAuthn::FakeClient.new(domain)
      second_credential = second_client.create(challenge: challenge, user_verified: true)

      expect do
        post :create,
             params: { credential: second_credential, nickname: 'Windows Hello' },
             session: registration_session
      end.to change { user.webauthn_credentials.passkeys.count }.by(1)

      expect(security_key.reload).to_not be_passkey
      expect(response).to have_http_status(200)
    end

    it 'rejects an expired challenge' do
      expect do
        post :create,
             params: { credential: credential, nickname: 'iPhone' },
             session: registration_session(issued_at: 6.minutes.ago)
      end.to_not(change { user.webauthn_credentials.count })

      expect(response).to have_http_status(422)
    end

    it 'rejects a challenge after it has been consumed' do
      post :create, params: { credential: credential, nickname: 'iPhone' }, session: registration_session

      expect do
        post :create, params: { credential: credential, nickname: 'Replay' }
      end.to_not(change { user.webauthn_credentials.count })

      expect(response).to have_http_status(422)
    end
  end

  describe 'DELETE #destroy' do
    it 'removes only the current user passkey' do
      passkey = Fabricate(:webauthn_credential, user_id: user.id, passkey: true)
      session[:challenge_passed_at] = Time.now.utc

      delete :destroy, params: { id: passkey.id }

      expect(response).to redirect_to(settings_passkeys_path)
      expect(flash[:success]).to eq(I18n.t('passkeys.destroy.success'))
      expect { passkey.reload }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'does not remove a security key through the passkey endpoint' do
      security_key = Fabricate(:webauthn_credential, user_id: user.id)
      session[:challenge_passed_at] = Time.now.utc

      expect do
        delete :destroy, params: { id: security_key.id }
      end.to_not(change { user.webauthn_credentials.count })
    end
  end

  def registration_session(issued_at: Time.now.utc)
    {
      passkey_registration_challenge: {
        'challenge' => challenge,
        'issued_at' => issued_at.to_i,
      },
    }
  end
end
