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
    expect(response.body).to_not include('content__heading__tabs')
    expect(response.body).to_not include('&#39;dark&#39;')
    expect(response.body).to_not include('Editor e emojis', 'Editor and emoji')
    expect(response.parsed_body.css('button[type="submit"]').count).to eq(2)
    expect(response.parsed_body.css('button[name="reset_all"]').count).to eq(1)
    expect(response.parsed_body.css('input[name^="reset["]').count).to eq(0)
  end

  it 'restores every customization with one action' do
    sign_in Fabricate(:admin_user)
    Setting.status_character_limit = 750
    Setting.instance_accent_color = '#5638cc'

    put admin_settings_instance_customization_path, params: valid_params.merge(reset_all: '1')

    expect(response).to redirect_to(admin_settings_instance_customization_path)
    expect(Setting.find_by(var: :status_character_limit)).to be_nil
    expect(Setting.find_by(var: :instance_accent_color)).to be_nil
  end

  it 'renders a native single-line sidebar entry with an available icon' do
    sign_in Fabricate(:admin_user)
    get admin_settings_instance_customization_path

    navigation_link = response.parsed_body.at_css(".sidebar a[href='#{admin_settings_instance_customization_path}']")
    expect(navigation_link).to be_present
    expect(navigation_link.parent['id']).to eq('instance_customization')
    expect(navigation_link.text).to include(I18n.t('admin.settings.instance_customization.title'))
    expect(navigation_link.at_css('svg.material-edit')).to be_present
    expect(response.body).to include(I18n.t('settings.back', site_title: Setting.site_title))
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
