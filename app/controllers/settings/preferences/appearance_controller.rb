# frozen_string_literal: true

class Settings::Preferences::AppearanceController < Settings::Preferences::BaseController
  def update
    return forbidden if instance_theme_submitted? && !current_user.can?(:manage_settings)
    return bad_request if instance_theme_submitted? && Themes.instance.names.exclude?(instance_theme)

    super
  end

  private

  def after_preferences_update
    Setting.theme = instance_theme if instance_theme_submitted?
  end

  def after_update_redirect_path
    settings_preferences_appearance_path
  end

  def instance_theme
    params[:instance_theme]
  end

  def instance_theme_submitted?
    params.key?(:instance_theme)
  end
end
