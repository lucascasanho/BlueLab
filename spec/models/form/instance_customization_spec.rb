# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Form::InstanceCustomization do
  subject(:form) { described_class.new(attributes) }

  let(:attributes) do
    {
      status_character_limit: '5000',
      admin_status_character_limit: '20000',
      hide_status_character_counter: '0',
      hide_admin_status_character_counter: '1',
      media_image_size_limit_mb: '80',
      media_video_size_limit_mb: '512',
      instance_accent_color: '#5638cc',
      email_primary_color: '#5638cc',
      email_button_color: '#5638cc',
      email_link_color: '#5638cc',
    }
  end

  it 'persists validated values through the native Setting cache' do
    expect(form.save).to be true
    expect(Setting.status_character_limit).to eq 5000
    expect(Setting.admin_status_character_limit).to eq 20_000
    expect(Setting.media_image_size_limit_mb).to eq 80
    expect(Setting.hide_status_character_counter).to be false
    expect(Setting.hide_admin_status_character_counter).to be true
  end

  it 'rejects an administrator limit below the standard limit' do
    form.admin_status_character_limit = '4999'
    expect(form).to_not be_valid
  end

  it 'rejects unsafe colors and technical media limits' do
    form.instance_accent_color = 'red; background:url(example)'
    form.media_video_size_limit_mb = '2048'
    expect(form).to_not be_valid
  end

  it 'restores a setting to its configured default' do
    Setting.status_character_limit = 1234
    expect(form.save(reset_keys: %w(status_character_limit))).to be true
    expect(Setting.status_character_limit).to eq 500
  end

  it 'keeps standard and administrator counter visibility independent' do
    expect(form.save).to be true
    expect(Setting.hide_status_character_counter).to be false
    expect(Setting.hide_admin_status_character_counter).to be true
  end
end
