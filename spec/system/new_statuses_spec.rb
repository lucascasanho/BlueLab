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

    click_button frontend_translations('compose.new')
    click_button frontend_translations('compose.new.post')

    within('[data-bluelab-composer]') do
      find('[role="textbox"]').set(status_text)
      click_button frontend_translations('compose.publish')
    end

    expect(page)
      .to have_css('.status__content__text', text: status_text)
  end

  def visit_homepage
    visit root_path

    expect(page)
      .to have_css('div.app-holder')
      .and have_button(frontend_translations('compose.new'))
  end
end
