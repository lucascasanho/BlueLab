# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'BlueLab instance accent bridge' do
  it 'emits the saved instance accent for the BlueLab theme' do
    sign_in Fabricate(:admin_user)
    Setting.theme = 'blue-2'
    Setting.instance_accent_color = '#d52a96'

    get admin_settings_instance_customization_path

    expect(response.body).to include('--bluelab-instance-accent: #d52a96;')
  end

  it 'keeps the native BlueLab blue when no custom accent is saved' do
    sign_in Fabricate(:admin_user)
    Setting.theme = 'blue-2'

    get admin_settings_instance_customization_path

    expect(response.body).to include('--bluelab-instance-accent: #0085ff;')
  end

  it 'does not emit the BlueLab bridge for another theme' do
    sign_in Fabricate(:admin_user)
    Setting.theme = 'default'
    Setting.instance_accent_color = '#d52a96'

    get admin_settings_instance_customization_path

    expect(response.body).to_not include('--bluelab-instance-accent:')
  end
end
