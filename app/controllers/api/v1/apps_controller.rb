# frozen_string_literal: true

class Api::V1::AppsController < Api::BaseController
  skip_before_action :require_authenticated_user!
  before_action :block_known_registration_automation, only: :create

  def create
    @app = Doorkeeper::Application.create!(application_options)
    render json: @app, serializer: REST::CredentialApplicationSerializer
  end

  private

  def application_options
    {
      name: app_params[:client_name],
      redirect_uri: app_params[:redirect_uris],
      scopes: app_scopes_or_default,
      website: app_params[:website],
    }
  end

  def app_scopes_or_default
    app_params[:scopes] || Doorkeeper.configuration.default_scopes
  end

  def app_params
    params.permit(:client_name, :scopes, :website, :redirect_uris, redirect_uris: [])
  end

  def block_known_registration_automation
    return unless RegistrationProtection.known_automation_application?(app_params)

    render json: { error: I18n.t('auth.registration_protection.automation_detected') }, status: 403
  end
end
