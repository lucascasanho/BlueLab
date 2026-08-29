# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin instance customization settings' do
  let(:valid_params) do
    {
      form_instance_customization: {
        status_character_limit: 500,
        admin_status_character_limit: 10_000,
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
