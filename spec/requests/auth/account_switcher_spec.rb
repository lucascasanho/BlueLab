# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Auth Account Switcher' do
  let(:current_user) { Fabricate(:user, confirmed_at: 2.days.ago, password: 'current-password') }
  let(:target_user) { Fabricate(:user, confirmed_at: 2.days.ago, password: 'target-password') }

  describe 'GET /auth/sign_in?account_switcher=1' do
    before do
      sign_in current_user
    end

    it 'renders the additional-account login form without signing out the current account' do
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
    end
  end

  describe 'POST /auth/account_switcher/authenticate' do
    before do
      sign_in current_user
    end

    it 'authenticates the target account without destroying the current account session' do
      post auth_account_switcher_authenticate_path, params: {
        user: {
          email: target_user.email,
          password: 'target-password',
        },
      }

      expect(response).to redirect_to(root_path)
      expect(current_user.session_activations).to be_present
      expect(target_user.session_activations).to be_present

      get root_path

      expect(controller.current_user).to eq target_user
      expect(SessionActivation.where(user: current_user)).to be_present
    end

    it 'rejects invalid credentials and keeps the current account signed in' do
      original_session_id = cookies.signed['_session_id']

      post auth_account_switcher_authenticate_path, params: {
        user: {
          email: target_user.email,
          password: 'wrong-password',
        },
      }

      expect(response).to redirect_to(new_user_session_path(account_switcher: '1'))
      expect(SessionActivation.find_by(session_id: original_session_id, user: current_user)).to be_present
    end
  end

  describe 'POST /auth/account_switcher/switch' do
    before do
      sign_in current_user
      @target_session_id = target_user.activate_session(request)
    end

    it 'switches to the stored session without destroying either account session' do
      post auth_account_switcher_switch_path, params: {
        session_id: @target_session_id,
      }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq(
        'ok' => true,
        'account_id' => target_user.account_id.to_s,
      )
      expect(response.cookies['_session_id']).to be_present

      get root_path

      expect(controller.current_user).to eq target_user
      expect(SessionActivation.find_by(session_id: @target_session_id, user: target_user)).to be_present
      expect(current_user.session_activations).to be_present
    end

    it 'rejects an unknown session id' do
      post auth_account_switcher_switch_path, params: {
        session_id: SecureRandom.hex(32),
      }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'Account switcher session credential' do
    it 'uses the current SessionActivation id as the browser switcher credential' do
      sign_in current_user
      get root_path

      expect(response).to have_http_status(:ok)

      expect(current_user.session_activations.find_by(session_id: cookies.signed['_session_id'])).to be_present
    end
  end
end
