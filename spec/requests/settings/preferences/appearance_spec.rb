# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Settings Preferences Appearance' do
  let(:user) { Fabricate(:user) }

  describe 'GET /settings/preferences/appearance' do
    before do
      sign_in user
      get settings_preferences_appearance_path
    end

    it 'shows one per-user theme selector and never exposes the instance theme selector' do
      expect(response).to have_http_status(:success)
      expect(response.body).to include('user[settings_attributes][bluelab_theme]')
      expect(response.body).to_not include('name="instance_theme"')
      expect(response.body).to_not include('id="instance_theme"')
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

    it 'saves Vanilla as a per-user theme without changing the instance theme' do
      Setting.theme = 'blue-2'

      expect do
        put settings_preferences_appearance_path,
            params: { user: { settings_attributes: { bluelab_theme: 'default', 'web.color_scheme': 'dark' } } }
      end.to change { user.reload.settings['bluelab_theme'] }.to('default')

      expect(response).to redirect_to(settings_preferences_appearance_path)
      expect(Setting.theme).to eq('blue-2')
      expect(user.reload.settings['web.color_scheme']).to eq('dark')
    end

    it 'rejects an unknown per-user theme' do
      put settings_preferences_appearance_path,
          params: { user: { settings_attributes: { bluelab_theme: 'unknown-theme' } } }

      expect(response).to have_http_status(400)
    end

    it 'does not allow a user to submit an instance theme through preferences' do
      Setting.theme = 'blue-2'

      expect do
        put settings_preferences_appearance_path,
            params: { instance_theme: 'default', user: { settings_attributes: {} } }
      end.to_not change(Setting, :theme)

      expect(response).to redirect_to(settings_preferences_appearance_path)
    end

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
