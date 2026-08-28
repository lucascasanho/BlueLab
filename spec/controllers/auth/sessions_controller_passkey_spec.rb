# frozen_string_literal: true

require 'rails_helper'
require 'webauthn/fake_client'

RSpec.describe Auth::SessionsController do
  render_views

  let(:user) { Fabricate(:user, email: 'passkey@example.com', password: 'abcdefgh', webauthn_id: WebAuthn.generate_user_id) }
  let(:domain) { "#{Rails.configuration.x.use_https ? 'https' : 'http'}://#{Rails.configuration.x.web_domain}" }
  let(:authenticator) { WebAuthn::FakeAuthenticator.new }
  let(:fake_client) { WebAuthn::FakeClient.new(domain, authenticator: authenticator) }
  let(:challenge) { WebAuthn::Credential.options_for_get.challenge }
  let(:user_handle) { WebAuthn.configuration.encoder.decode(user.webauthn_id) }
  let(:assertion) { fake_client.get(challenge: challenge, user_verified: true, user_handle: user_handle, sign_count: 10) }
  let!(:passkey) do
    created = WebAuthn::Credential.from_create(fake_client.create(user_verified: true))
    Fabricate(
      :webauthn_credential,
      user_id: user.id,
      external_id: created.id,
      public_key: created.public_key,
      sign_count: created.sign_count,
      passkey: true
    )
  end

  before do
    request.env['devise.mapping'] = Devise.mappings[:user]
  end

  describe 'GET #passkey_options' do
    it 'returns usernameless options without exposing credential IDs' do
      get :passkey_options

      expect(response).to have_http_status(200)
      expect(response.parsed_body).to include('challenge' => be_present, 'userVerification' => 'required')
      expect(response.parsed_body['allowCredentials']).to be_blank
    end
  end

  describe 'POST #passkey' do
    it 'signs in with a valid passkey and updates its sign count' do
      post :passkey, params: { credential: assertion }, session: authentication_session

      expect(response).to have_http_status(200)
      expect(controller.current_user).to eq(user)
      expect(passkey.reload.sign_count).to eq(10)
      expect(user.login_activities.last).to be_passkey
    end

    it 'preserves a configured second-factor step' do
      user.update!(otp_required_for_login: true, otp_secret: User.generate_otp_secret)

      post :passkey, params: { credential: assertion }, session: authentication_session

      expect(controller.current_user).to be_nil
      expect(response.parsed_body['redirect_path']).to eq(auth_passkey_two_factor_path)
      expect(session[:attempt_user_id]).to eq(user.id)
    end

    it 'rejects an unknown credential without exposing account information' do
      unknown = assertion.deep_dup
      unknown_id = Base64.urlsafe_encode64(SecureRandom.random_bytes(16), padding: false)
      unknown['id'] = unknown_id
      unknown['rawId'] = unknown_id

      post :passkey, params: { credential: unknown }, session: authentication_session

      expect(response).to have_http_status(422)
      expect(response.parsed_body).to eq('error' => I18n.t('passkeys.authentication_error'))
      expect(controller.current_user).to be_nil
    end

    it 'rejects an invalid challenge' do
      post :passkey, params: { credential: assertion }, session: authentication_session(challenge: WebAuthn::Credential.options_for_get.challenge)

      expect(response).to have_http_status(422)
      expect(controller.current_user).to be_nil
    end

    it 'rejects an expired challenge' do
      post :passkey, params: { credential: assertion }, session: authentication_session(issued_at: 6.minutes.ago)

      expect(response).to have_http_status(422)
      expect(controller.current_user).to be_nil
    end

    it 'rejects a reused challenge' do
      post :passkey, params: { credential: assertion }, session: authentication_session

      sign_out user
      post :passkey, params: { credential: assertion }

      expect(response).to have_http_status(422)
    end

    it 'rejects a credential presented with another user handle' do
      other_user = Fabricate(:user, webauthn_id: WebAuthn.generate_user_id)
      other_user_handle = WebAuthn.configuration.encoder.decode(other_user.webauthn_id)
      mismatched_assertion = fake_client.get(challenge: challenge, user_verified: true, user_handle: other_user_handle, sign_count: 10)

      post :passkey, params: { credential: mismatched_assertion }, session: authentication_session

      expect(response).to have_http_status(422)
      expect(controller.current_user).to be_nil
    end

    it 'rejects an assertion from a different origin' do
      other_client = WebAuthn::FakeClient.new('https://invalid.example', authenticator: authenticator)
      invalid_assertion = other_client.get(challenge: challenge, rp_id: URI.parse(domain).host, user_verified: true, user_handle: user_handle, sign_count: 10)

      post :passkey, params: { credential: invalid_assertion }, session: authentication_session

      expect(response).to have_http_status(422)
    end

    it 'rejects an assertion for a different RP ID' do
      other_authenticator = WebAuthn::FakeAuthenticator.new
      other_client = WebAuthn::FakeClient.new(domain, authenticator: other_authenticator)
      other_created = WebAuthn::Credential.from_create(other_client.create(rp_id: 'invalid.example', user_verified: true))
      passkey.update!(external_id: other_created.id, public_key: other_created.public_key)
      invalid_assertion = other_client.get(challenge: challenge, rp_id: 'invalid.example', user_verified: true, user_handle: user_handle, sign_count: 10)

      post :passkey, params: { credential: invalid_assertion }, session: authentication_session

      expect(response).to have_http_status(422)
    end

    it 'rejects an assertion without user verification' do
      unverified = fake_client.get(challenge: challenge, user_verified: false, user_handle: user_handle, sign_count: 10)

      post :passkey, params: { credential: unverified }, session: authentication_session

      expect(response).to have_http_status(422)
    end

    it 'rejects an assertion with an invalid signature' do
      invalid = assertion.deep_dup
      invalid['response']['signature'] = Base64.urlsafe_encode64(SecureRandom.random_bytes(64), padding: false)

      post :passkey, params: { credential: invalid }, session: authentication_session

      expect(response).to have_http_status(422)
    end

    it 'rejects a passkey belonging to an invalid user' do
      user.account.update!(memorial: true)

      post :passkey, params: { credential: assertion }, session: authentication_session

      expect(response).to have_http_status(422)
    end

    it 'rejects a removed passkey' do
      passkey.destroy!

      post :passkey, params: { credential: assertion }, session: authentication_session

      expect(response).to have_http_status(422)
    end
  end

  describe 'traditional login' do
    it 'continues to accept email and password' do
      post :create, params: { user: { email: user.email, password: 'abcdefgh' } }

      expect(controller.current_user).to eq(user)
    end
  end

  def authentication_session(challenge: self.challenge, issued_at: Time.now.utc)
    {
      passkey_authentication_challenge: {
        'challenge' => challenge,
        'issued_at' => issued_at.to_i,
      },
    }
  end
end
