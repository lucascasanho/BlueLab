# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Auth Account Switcher' do
  let(:current_user) { Fabricate(:user, confirmed_at: 2.days.ago) }
  let(:target_user) { Fabricate(:user, confirmed_at: 2.days.ago) }

  describe 'POST /auth/account_switcher/switch' do
    before do
      sign_in current_user
    end

    it 'moves to an active session activation without revoking the current account' do
      target_session_id = target_user.activate_session(request)
      activation = target_user.session_activations.find_by!(session_id: target_session_id)

      post auth_account_switcher_switch_path, params: { token: activation.token }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq(
        'ok' => true,
        'account_id' => target_user.account_id.to_s,
      )
      expect(response.cookies['_session_id']).to be_present
      expect(current_user.session_activations).to be_present
    end

    it 'rejects a token that does not belong to a session activation' do
      post auth_account_switcher_switch_path, params: { token: SecureRandom.hex(32) }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET /auth/sign_in?account_switcher=1' do
    before do
      sign_in current_user
    end

    it 'renders the login form without discarding the current login' do
      get new_user_session_path, params: { account_switcher: '1' }

      expect(response).to have_http_status(:ok)
      expect(response.body).to include('Sign in to another account')
      expect(current_user.session_activations).to be_present
    end
  end
end
