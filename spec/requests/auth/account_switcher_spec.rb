# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Auth Account Switcher' do
  let(:current_user) { Fabricate(:user, confirmed_at: 2.days.ago) }
  let(:target_user) { Fabricate(:user, confirmed_at: 2.days.ago) }

  describe 'POST /auth/account_switcher/switch' do
    before do
      sign_in current_user
    end

    it 'creates a fresh session from the target account persistent credential without revoking the current account' do
      target_token = target_user.account_switcher_token

      post auth_account_switcher_switch_path, params: { token: target_token }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq(
        'ok' => true,
        'account_id' => target_user.account_id.to_s,
      )
      expect(response.cookies['_session_id']).to be_present
      expect(current_user.session_activations).to be_present
      expect(target_user.session_activations).to be_present
    end

    it 'rejects an invalid token' do
      post auth_account_switcher_switch_path, params: { token: SecureRandom.hex(32) }

      expect(response).to have_http_status(:not_found)
    end
  end


  describe 'POST /auth/sign_in?account_switcher=1' do
    let(:target_user) { Fabricate(:user, email: 'target@example.com', password: 'target-password', confirmed_at: 2.days.ago) }

    before do
      sign_in current_user
      original_session_id = cookies.signed['_session_id']

      get new_user_session_path, params: { account_switcher: '1' }
      post user_session_path, params: {
        account_switcher: '1',
        user: {
          email: target_user.email,
          password: 'target-password',
        },
      }

      @original_session_id = original_session_id
    end

    it 'keeps the previous session activation while signing into another account' do
      expect(response).to have_http_status(:redirect)
      expect(SessionActivation.find_by(session_id: @original_session_id, user_id: current_user.id)).to be_present
      expect(target_user.session_activations).to be_present
    end
  end

  describe 'GET /auth/sign_in?account_switcher=1' do
    before do
      sign_in current_user
    end

    it 'renders the login form without discarding the current login' do
      get new_user_session_path, params: { account_switcher: '1' }

      expect(response).to have_http_status(:ok)
      expect(response.body).to include(I18n.t('auth.sign_in.another_account.title'))
      expect(response.body).to include(I18n.t('auth.sign_in.another_account.notice'))
      expect(current_user.session_activations).to be_present
    end

    it 'uses the requested locale for the additional-account login page' do
      request.headers['Accept-Language'] = 'pt-BR'
      get new_user_session_path, params: { account_switcher: '1' }

      expect(response.body).to include('Entrar em outra conta')
      expect(response.body).to include('Sua conta atual continuará disponível no seletor de contas.')
    end
  end
end
