# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'NewStatuses', :inline_jobs, :js, :streaming do
  include ProfileStories

  let(:email)               { 'test@example.com' }
  let(:password)            { 'password' }
  let(:confirmed_at)        { Time.zone.now }
  let(:finished_onboarding) { true }
  let(:status_text) { 'This is a new status!' }

  before { as_a_logged_in_user }

  it 'can be posted' do
    visit_homepage

    if page.has_button?(frontend_translations('compose_form.placeholder'))
      # Blue2 has an inline launcher that opens the composer directly.
      click_button frontend_translations('compose_form.placeholder')
    elsif page.has_button?(frontend_translations('tabs_bar.publish'))
      # The Mastodon editor in the redesigned navigation has a direct launcher.
      click_button frontend_translations('tabs_bar.publish')
    else
      # The legacy composer launcher first asks whether to create a post or a message.
      click_button frontend_translations('compose.new')
      click_button frontend_translations('compose.new.post')
    end

    within('[data-bluelab-composer]') do
      find('[role="textbox"]').set(status_text)
      click_button frontend_translations('compose.publish')
    end

    click_on frontend_translations('compose.published.open')

    expect(page)
      .to have_css('.status__content__text', text: status_text)
  end

  def visit_homepage
    visit root_path

    # Confirm that the application shell loaded; composer launchers vary by theme.
    expect(page).to have_css('div.app-holder')
  end
end
