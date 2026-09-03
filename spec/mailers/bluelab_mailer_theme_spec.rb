# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'BlueLab mailer theme' do
  let(:receiver) { Fabricate(:user) }
  let(:mail) { UserMailer.confirmation_instructions(receiver, 'spec') }

  before do
    Setting.site_title = 'Example Social'
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
    expect(html).to include('@media (prefers-color-scheme: dark)', '[data-ogsc]', '[data-ogsb]')
    expect(html).to include('color-scheme: light dark', '-webkit-text-fill-color: #ffffff')
  end

  it 'keeps explicit email color overrides' do
    Setting.email_button_color = '#245f91'
    Setting.email_link_color = '#1d4f78'
    Setting.email_dark_surface_color = '#102334'

    html = mail.html_part.body.decoded

    expect(html).to include('#245f91', '#1d4f78', '#102334')
  end

  it 'removes structural separator lines from the BlueLab mail layout' do
    html = mail.html_part.body.decoded

    expect(html).to include('border-top: 0 !important', 'border-bottom: 0 !important')
  end

  it 'does not reference the obsolete generic mailer logo fallback' do
    html = mail.html_part.body.decoded

    expect(html).to_not include('images/mailer/logo.png')
    expect(html).to include('Example Social')
  end

  it 'uses the instance title instead of Mastodon in branded subjects' do
    receiver.update!(locale: :'pt-BR')
    reset_mail = UserMailer.reset_password_instructions(receiver, 'spec')

    expect(reset_mail.subject).to include('Example Social')
    expect(reset_mail.subject).to_not include('Mastodon')
  end

  it 'uses the instance title in welcome copy that refers to the local service' do
    receiver.update!(locale: :'pt-BR')
    welcome_html = UserMailer.welcome(receiver).html_part.body.decoded
    expected_step = I18n.t('user_mailer.welcome.follow_step', locale: :'pt-BR').gsub(/\bMastodon\b/, 'Example Social')

    expect(welcome_html).to include(expected_step)
  end
end
