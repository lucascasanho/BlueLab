# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'BlueLab mailer theme' do
  let(:receiver) { Fabricate(:user) }
  let(:mail) { UserMailer.confirmation_instructions(receiver, 'spec') }

  before do
    Setting.instance_accent_color = '#2b8fcd'
    Setting.instance_light_background_color = '#f7f9fa'
    Setting.instance_light_surface_color = '#ffffff'
    Setting.instance_light_text_color = '#0f1419'
    Setting.instance_dark_background_color = '#000000'
    Setting.instance_dark_surface_color = '#16181c'
    Setting.instance_dark_text_color = '#f7f9f9'
  end

  it 'inherits the instance palette when email-specific colors are not persisted' do
    html = mail.html_part.body.decoded

    expect(html).to include('#2b8fcd', '#f7f9fa', '#ffffff', '#0f1419', '#000000', '#16181c', '#f7f9f9')
    expect(html).to include('@media (prefers-color-scheme: dark)', '[data-ogsc]')
  end

  it 'keeps explicit email color overrides' do
    Setting.email_button_color = '#245f91'
    Setting.email_link_color = '#1d4f78'
    Setting.email_dark_surface_color = '#102334'

    html = mail.html_part.body.decoded

    expect(html).to include('#245f91', '#1d4f78', '#102334')
  end
end
