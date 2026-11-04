# frozen_string_literal: true

class Settings::Preferences::AppearanceController < Settings::Preferences::BaseController
  def update
    return bad_request if theme_submitted? && Themes.instance.selectable_names.exclude?(user_theme)

    super
  end

  private

  def user_theme
    params.dig(:user, :settings_attributes, :bluelab_theme).to_s
  end

  def theme_submitted?
    settings = params.dig(:user, :settings_attributes)
    settings.respond_to?(:key?) && (settings.key?(:bluelab_theme) || settings.key?('bluelab_theme'))
  end

  def user_params
    permitted = super
    settings = permitted[:settings_attributes]
    settings.delete(:theme) if settings.respond_to?(:delete)
    permitted
  end

  def after_update_redirect_path
    settings_preferences_appearance_path
  end
end
