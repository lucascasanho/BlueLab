# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'OCR', :attachment_processing, :inline_jobs, :js, :streaming do
  include ProfileStories

  let(:email)               { 'test@example.com' }
  let(:password)            { 'password' }
  let(:confirmed_at)        { Time.zone.now }
  let(:finished_onboarding) { true }

  before do
    as_a_logged_in_user
    visit root_path
  end

  it 'can recognize text in a media attachment' do
    expect(page).to have_css('div.app-holder')

    click_button frontend_translations('compose.new')
    click_button frontend_translations('compose.new.post')

    within('[data-bluelab-composer]') do
      find('input[type="file"]', visible: :all).attach_file(file_fixture('text.png'))
      click_button frontend_translations('compose.upload.edit')
    end

    click_on('Add text from image')

    expect(page).to have_css('#description', text: /Hello Mastodon\s*/, wait: 20)
  end
end
