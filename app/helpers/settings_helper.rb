# frozen_string_literal: true

module SettingsHelper
  def filterable_languages
    LanguagesHelper.sorted_locale_keys(LanguagesHelper::SUPPORTED_LOCALES.keys)
  end

  def ui_languages
    LanguagesHelper.sorted_locale_keys(I18n.available_locales)
  end

  def inline_qrcode_svg(code)
    code
      .as_svg(padding: 0, module_size: 4, use_path: true)
      .html_safe # rubocop:disable Rails/OutputSafety
  end

  def user_settings_collection(value)
    UserSettings.definition_for(value)&.in || []
  end

  def author_attribution_name(account)
    return if account.nil?

    link_to(root_url, class: 'story__details__shared__author-link') do
      safe_join(
        [image_tag(account.avatar.url, class: 'account__avatar', size: 16, alt: ''), tag.bdi(display_name(account))]
      )
    end
  end

  def session_device_icon(session)
    device = session.detection.device

    if device.mobile?
      'smartphone'
    elsif device.tablet?
      'tablet'
    else
      'desktop_mac'
    end
  end

  def compact_account_link_to(account)
    return if account.nil?

    link_to ActivityPub::TagManager.instance.url_for(account), class: 'name-tag', title: account.acct do
      safe_join([image_tag(account.avatar.url, width: 15, height: 15, alt: '', class: 'avatar'), content_tag(:span, account.acct, class: 'username')], ' ')
    end
  end

  def time_zone_options
    time_zones = ActiveSupport::TimeZone.all + [ActiveSupport::TimeZone['America/Campo_Grande']]

    time_zones
      .uniq { |time_zone| time_zone.tzinfo.name }
      .sort
      .map do |time_zone|
        name = if time_zone.tzinfo.name == 'America/Campo_Grande'
                 I18n.t('time_zones.campo_grande')
               else
                 time_zone.name
               end

        ["(GMT#{time_zone.now.formatted_offset}) #{name}", time_zone.tzinfo.name]
      end
  end
end
