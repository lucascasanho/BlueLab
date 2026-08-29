# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin instance customization settings' do
  let(:valid_params) do
    {
      form_instance_customization: {
        status_character_limit: 500,
        admin_status_character_limit: 10_000,
        hide_status_character_counter: '0',
        hide_admin_status_character_counter: '1',
        media_image_size_limit_mb: 100,
        media_video_size_limit_mb: 1024,
        instance_accent_color: '',
        email_primary_color: '#5638cc',
        email_button_color: '#5638cc',
        email_link_color: '#5638cc',
      },
    }
  end

  it 'allows administrators and records an audit entry' do
    sign_in Fabricate(:admin_user)

    expect { put admin_settings_instance_customization_path, params: valid_params }
      .to change { Admin::ActionLog.where(action: 'update_instance_customization').count }.by(1)
    expect(response).to redirect_to(admin_settings_instance_customization_path)
  end

  it 'renders understandable color controls without the editor explanation' do
    sign_in Fabricate(:admin_user)
    get admin_settings_instance_customization_path

    expect(response).to have_http_status(200)
    expect(response.body).to include(I18n.t('admin.settings.instance_customization.effective_color'), '#6364ff')
    expect(response.body).to include(I18n.t('admin.settings.instance_customization.hide_status_character_counter'))
    expect(response.body).to include('[data-color-scheme=dark]')
    expect(response.body).to include(I18n.t('admin.settings.instance_customization.tab_title'))
    expect(response.body).to include('content__heading__tabs--settings')
    expect(response.body).to_not include('&#39;dark&#39;')
    expect(response.body).to_not include('Editor e emojis', 'Editor and emoji')
  end

  it 'rejects users without settings permission' do
    sign_in Fabricate(:user)
    put admin_settings_instance_customization_path, params: valid_params
    expect(response).to have_http_status(403)
  end

  it 'rejects non-allowlisted parameters' do
    sign_in Fabricate(:admin_user)
    expect do
      put admin_settings_instance_customization_path, params: { form_instance_customization: valid_params[:form_instance_customization].merge(arbitrary_css: 'body{}') }
    end.to(not_change { Setting[:arbitrary_css] })
    expect(response).to redirect_to(admin_settings_instance_customization_path)
  end
end
