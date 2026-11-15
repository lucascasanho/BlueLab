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

      # Blue2 and the redesigned navigation use different account-menu
      # triggers. Prefer explicit selectors so the test opens the intended menu.
      if page.has_css?('button[aria-label="Account settings"]')
        find('button[aria-label="Account settings"]').click
      elsif page.has_css?('[data-testid="account-menu-trigger"]')
        find('[data-testid="account-menu-trigger"]').click
      else
        click_button frontend_translations('tabs_bar.account_settings')
      end

      # The redesigned navigation exposes a test id; Blue2 exposes a menu role.
      menu_selector = if page.has_css?('[data-testid="account-menu"]')
                        '[data-testid="account-menu"]'
                      else
                        '[role="menu"]'
                      end
      expect(page).to have_css(menu_selector)

      within(menu_selector) do
        click_button frontend_translations('navigation_bar.logout')
      end

      click_button frontend_translations('confirmations.logout.confirm')

      expect(page)
        .to have_title(I18n.t('auth.login'))
        .and have_current_path('/auth/sign_in')
    end
  end
end
