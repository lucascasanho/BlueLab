# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Settings Preferences Appearance' do
  let(:user) { Fabricate(:user) }

  describe 'GET /settings/preferences/appearance' do
    before do
      sign_in user
      get settings_preferences_appearance_path
    end

    it 'does not expose a per-user theme selector' do
      expect(response.body).to_not include('user[settings_attributes][theme]')
    end

    it 'keeps the light, dark, and automatic color scheme preference' do
      expect(response.body).to include('user[settings_attributes][web.color_scheme]')
      expect(response.body).to include('value="auto"')
      expect(response.body).to include('value="light"')
      expect(response.body).to include('value="dark"')
    end
  end

  describe 'PUT /settings/preferences/appearance' do
    before { sign_in user }

    it 'does not accept the legacy per-user theme parameter' do
      user.settings['theme'] = 'blue-2'
      user.save!

      put settings_preferences_appearance_path, params: { user: { settings_attributes: { theme: 'default' } } }

      expect(response).to redirect_to(settings_preferences_appearance_path)
      expect(user.reload.settings['theme']).to eq('blue-2')
    end

    it 'gracefully handles invalid nested params' do
      put settings_preferences_appearance_path(user: 'invalid')

      expect(response)
        .to have_http_status(400)
    end
  end
end
