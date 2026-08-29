# frozen_string_literal: true

class Admin::Settings::InstanceCustomizationController < Admin::BaseController
  def show
    authorize :settings, :show?
    @instance_customization = Form::InstanceCustomization.new
  end

  def update
    authorize :settings, :update?
    @instance_customization = Form::InstanceCustomization.new(customization_params)
    reset_keys = params.fetch(:reset, {}).keys
    previous_values = audit_values

    if @instance_customization.save(reset_keys: reset_keys)
      Admin::ActionLog.create!(
        account: current_account,
        action: :update_instance_customization,
        target: current_account,
        recorded_changes: { previous: previous_values, current: audit_values, reset: reset_keys },
        recorded_changes_format: 'custom'
      )
      redirect_to admin_settings_instance_customization_path, notice: t('generic.changes_saved_msg')
    else
      render :show
    end
  end

  private

  def customization_params
    params.expect(form_instance_customization: [*Form::InstanceCustomization::KEYS])
  end

  def audit_values
    Form::InstanceCustomization::SCALAR_KEYS.index_with { |key| Setting.public_send(key) }.merge(
      Form::InstanceCustomization::UPLOAD_KEYS.index_with { |key| SiteUpload.find_by(var: key)&.file_file_name }
    )
  end
end
