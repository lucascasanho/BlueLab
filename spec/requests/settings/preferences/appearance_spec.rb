# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Settings Preferences Appearance' do
  describe 'GET /settings/preferences/appearance' do
    before do
      sign_in Fabricate(:user)
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
    before { sign_in Fabricate(:user) }

    it 'gracefully handles invalid nested params' do
      put settings_preferences_appearance_path(user: 'invalid')

      expect(response)
        .to have_http_status(400)
    end
  end
end
