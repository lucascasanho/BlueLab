# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin Settings Appearance' do
  describe 'GET /admin/settings/appearance' do
    it 'does not expose the theme selector to a regular user' do
      sign_in Fabricate(:user)

      get admin_settings_appearance_path

      expect(response).to have_http_status(403)
      expect(response.body).to_not include('form_admin_settings[theme]')
    end

    it 'exposes the theme selector with the granular manage settings permission' do
      role = Fabricate(:user_role, permissions: UserRole::FLAGS[:manage_settings])
      sign_in Fabricate(:user, role:)

      get admin_settings_appearance_path

      expect(response).to have_http_status(:success)
      expect(response.body).to include('form_admin_settings[theme]')
    end
  end

  describe 'PUT /admin/settings/appearance' do
    before { Setting.theme = 'blue-2' }

    it 'allows the granular manage settings permission to select the instance theme' do
      role = Fabricate(:user_role, permissions: UserRole::FLAGS[:manage_settings])
      sign_in Fabricate(:user, role:)

      expect do
        put admin_settings_appearance_path, params: { form_admin_settings: { theme: 'default' } }
      end.to change(Setting, :theme).to('default')

      expect(response).to redirect_to(admin_settings_appearance_path)
    end

    it 'does not allow a regular user to select the instance theme' do
      sign_in Fabricate(:user)

      expect do
        put admin_settings_appearance_path, params: { form_admin_settings: { theme: 'default' } }
      end.to_not change(Setting, :theme)

      expect(response).to have_http_status(403)
    end
  end
end
