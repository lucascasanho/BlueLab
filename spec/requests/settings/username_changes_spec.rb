# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Settings username changes' do
  let(:user) { Fabricate(:user, password: 'correct-password') }

  before do
    sign_in user
    allow(ActivityPub::UpdateDistributionWorker).to receive(:perform_async)
  end

  it 'renders the settings page' do
    get settings_username_change_path

    expect(response).to have_http_status(200)
    expect(response.body).to include(user.account.username)
  end

  it 'changes only the authenticated account through PATCH' do
    other_account = Fabricate(:account)

    patch settings_username_change_path, params: {
      account_id: other_account.id,
      form_username_change: { username: 'request_name', current_password: 'correct-password', confirmation: '1' },
    }

    expect(response).to redirect_to(settings_username_change_path)
    expect(user.account.reload.username).to eq('request_name')
    expect(other_account.reload.username).to_not eq('request_name')
  end

  it 'does not accept GET as a mutating operation' do
    expect do
      get settings_username_change_path, params: { form_username_change: { username: 'ignored' } }
    end.to_not(change { user.account.reload.username })
  end

  it 'returns an understandable error for a wrong password' do
    patch settings_username_change_path, params: {
      form_username_change: { username: 'request_name', current_password: 'wrong', confirmation: '1' },
    }

    expect(response).to have_http_status(422)
    expect(response.body).to include(I18n.t('settings.username_changes.errors.invalid_password'))
  end
end
