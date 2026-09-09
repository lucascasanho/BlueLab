# frozen_string_literal: true

class Settings::Preferences::BaseController < Settings::BaseController
  PERMITTED_USER_SETTINGS = UserSettings.keys.excluding(:theme).freeze

  def show; end

  def update
    if current_user.update(user_params)
      I18n.locale = current_user.locale
      redirect_to after_update_redirect_path, notice: I18n.t('generic.changes_saved_msg')
    else
      render :show
    end
  end

  private

  def after_update_redirect_path
    raise 'Override in controller'
  end

  def user_params
    # BlueLab themes are instance-wide and may only be changed through the
    # authorized admin settings endpoint. Do not retain the legacy per-user
    # theme parameter as an alternate write path.
    params.expect(user: [:locale, :time_zone, chosen_languages: [], settings_attributes: PERMITTED_USER_SETTINGS])
  end
end
