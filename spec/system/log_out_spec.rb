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

      # In Blue2 the account menu is an icon-only button named via aria-label.
      # The default redesigned shell exposes the label as visible button text.
      account_settings_selector = 'button[aria-label="Account settings"]'
      if page.has_css?(account_settings_selector)
        find(account_settings_selector).click
      else
        click_button frontend_translations('tabs_bar.account_settings')
      end
      click_on frontend_translations('navigation_bar.logout')
      click_on frontend_translations('confirmations.logout.confirm')

      expect(page)
        .to have_title(I18n.t('auth.login'))
        .and have_current_path('/auth/sign_in')
    end
  end
end
