# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Auth Sessions' do
  describe 'POST /auth/sign_in' do
    # The rack-attack check has issues with the non-nested invalid param used here
    before { Rack::Attack.enabled = false }
    after { Rack::Attack.enabled = true }

    it 'gracefully handles invalid nested params' do
      post user_session_path(user: 'invalid')

      expect(response)
        .to have_http_status(400)
    end


  describe 'valid credentials for an unconfirmed account' do
    let(:password) { 'password123' }
    let!(:user) do
      Fabricate(
        :user,
        password: password,
        password_confirmation: password,
        confirmed_at: nil,
        approved: false
      )
    end

    it 'authenticates the account before email confirmation' do
      post user_session_path, params: {
        user: {
          email: user.email,
          password: password,
        },
      }

      expect(response).to redirect_to(root_path)
    end
  end

  end
end
