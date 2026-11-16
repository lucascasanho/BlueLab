# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Log out' do
  include ProfileStories

  let(:finished_onboarding) { true }

  before do
    as_a_logged_in_user
  end

  describe 'Logging out from the preferences' do
    it 'logs the user out' do
      visit settings_path

      within '.sidebar' do
        click_on 'Logout'
      end

      expect(page)
        .to have_title(I18n.t('auth.login'))
        .and have_current_path('/auth/sign_in')
    end
  end

  describe 'Logging out from the JS app', :js, :streaming do
    it 'logs the user out' do
      # The frontend tries to load announcements after a short delay, but the session might be expired by then, and the browser will output an error.
      ignore_js_error(/Failed to load resource: the server responded with a status/)

      visit root_path
      expect(page)
        .to have_css('body', class: 'app-body')

      open_account_menu
      click_button frontend_translations('navigation_bar.logout')
      click_button frontend_translations('confirmations.logout.confirm')

      expect(page)
        .to have_title(I18n.t('auth.login'))
        .and have_current_path('/auth/sign_in')
    end
  end

  def open_account_menu
    # The redesigned navigation has an explicit trigger; use it before the
    # legacy Blue2 aria-label fallback to avoid clicking another account menu.
    if page.has_css?('[data-testid="account-menu-trigger"]')
      trigger = find('[data-testid="account-menu-trigger]')
      trigger.click
      expect(trigger).to have_attribute('aria-expanded', 'true')
    elsif page.has_css?('button[aria-label="Account settings"]')
      find('button[aria-label="Account settings"]').click
    else
      click_button frontend_translations('tabs_bar.account_settings')
    end
  end
end
