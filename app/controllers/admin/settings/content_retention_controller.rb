# frozen_string_literal: true

class Admin::Settings::ContentRetentionController < Admin::SettingsController
  def cleanup
    authorize :settings, :update?

    Admin::ContentRetentionCleanupWorker.perform_async

    redirect_to admin_settings_content_retention_path, notice: t('admin.settings.content_retention.cleanup_started')
  end

  private

  def after_update_redirect_path
    admin_settings_content_retention_path
  end
end
