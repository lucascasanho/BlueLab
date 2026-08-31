# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin content retention cleanup' do
  let(:admin_user) { Fabricate(:admin_user) }

  before do
    sign_in(admin_user)
    allow(Admin::ContentRetentionCleanupWorker).to receive(:perform_async)
  end

  it 'schedules the scoped cache cleanup' do
    post cleanup_admin_settings_content_retention_path

    expect(Admin::ContentRetentionCleanupWorker).to have_received(:perform_async).once
    expect(response).to redirect_to(admin_settings_content_retention_path)
  end
end
