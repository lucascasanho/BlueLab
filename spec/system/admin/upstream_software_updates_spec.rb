# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'reviewing official Mastodon commits through the admin interface' do
  let!(:batch) { Fabricate(:upstream_update_batch) }

  around do |example|
    original = Rails.configuration.x.mastodon.upstream_commit_check_enabled
    Rails.configuration.x.mastodon.upstream_commit_check_enabled = true
    example.run
  ensure
    Rails.configuration.x.mastodon.upstream_commit_check_enabled = original
  end

  it 'shows the existing update alert and complete notes to a DevOps user' do
    sign_in Fabricate(:owner_user)

    visit settings_profile_path
    click_on I18n.t('admin.software_updates.upstream.alert', count: 1)

    expect(page)
      .to have_title(I18n.t('admin.software_updates.title'))
      .and have_text(batch.head_sha.first(12))
      .and have_text('Improve the composer')
      .and have_text('app/javascript/mastodon/features/compose/index.tsx')

    click_on I18n.t('admin.software_updates.upstream.mark_reviewed')
    expect(page).to have_text(I18n.t('admin.software_updates.upstream.reviewed_badge'))
  end

  it 'does not show the alert to a user without the DevOps permission' do
    sign_in Fabricate(:user)

    visit settings_profile_path

    expect(page).to have_current_path(settings_profile_path)
    expect(page).to have_no_text(I18n.t('admin.software_updates.upstream.alert', count: 1))
  end
end
