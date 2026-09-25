# frozen_string_literal: true

class Settings::Preferences::AppearanceController < Settings::Preferences::BaseController
  def update
    if theme_submitted? && Themes::USER_SELECTABLE_NAMES.exclude?(user_theme)
      return bad_request
    end

    super
  end

  private

  def user_theme
    params.dig(:user, :settings_attributes, :theme).to_s
  end

  def theme_submitted?
    settings = params.dig(:user, :settings_attributes)
    settings.respond_to?(:key?) && (settings.key?(:theme) || settings.key?('theme'))
  end

  def after_update_redirect_path
    settings_preferences_appearance_path
  end
end
