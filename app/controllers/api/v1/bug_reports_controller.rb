# frozen_string_literal: true

class Api::V1::BugReportsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :write, :'write:reports' }
  before_action :require_user!

  def create
    @bug_report = BugReport.create!(
      account: current_account,
      description: bug_report_params[:description],
      browser: browser_details[:browser],
      browser_version: browser_details[:browser_version],
      operating_system: browser_details[:operating_system],
      operating_system_version: browser_details[:operating_system_version],
      interface_language: bug_report_params[:interface_language].presence || I18n.locale.to_s,
      theme: bug_report_params[:theme].presence,
      interface_layout: bug_report_params[:interface_layout].presence,
      current_path: bug_report_params[:current_path].presence,
      viewport: bug_report_params[:viewport].presence,
      app_version: bug_report_params[:app_version].presence || Rails.configuration.x.mastodon.version,
      request_id: request.request_id,
      user_agent: request.user_agent.to_s.truncate(2_000),
      client_errors: client_errors
    )

    Array(params[:files]).compact_blank.first(BugReport::MAX_ATTACHMENTS).each do |file|
      @bug_report.media_attachments.create!(
        account: current_account,
        file: file,
        delay_processing: true
      )
    end

    render json: {
      id: @bug_report.id,
      status: @bug_report.status,
      created_at: @bug_report.created_at.iso8601
    }, status: :created
  rescue ActiveRecord::RecordInvalid, Paperclip::Error, Mastodon::DimensionsValidationError, Mastodon::StreamValidationError => e
    @bug_report&.destroy
    Rails.logger.warn("Bug report rejected: #{e.class}: #{e.message}")
    render json: { error: 'Unable to save bug report' }, status: :unprocessable_content
  end

  private

  def bug_report_params
    params.permit(
      :description,
      :interface_language,
      :theme,
      :interface_layout,
      :current_path,
      :viewport,
      :app_version,
      :client_errors
    )
  end

  def client_errors
    raw = bug_report_params[:client_errors].to_s
    return [] if raw.blank? || raw.bytesize > 64.kilobytes

    parsed = JSON.parse(raw)
    return [] unless parsed.is_a?(Array)

    parsed.first(BugReport::MAX_CLIENT_ERRORS).filter_map do |error|
      next unless error.is_a?(Hash)

      {
        'type' => error['type'].to_s.truncate(32),
        'message' => error['message'].to_s.truncate(2_000),
        'stack' => error['stack'].to_s.truncate(4_000),
        'source' => error['source'].to_s.truncate(2_000),
        'status' => error['status'].to_i.presence,
        'method' => error['method'].to_s.truncate(16),
        'url' => error['url'].to_s.truncate(500),
        'request_id' => error['request_id'].to_s.truncate(128),
        'timestamp' => error['timestamp'].to_s.truncate(64)
      }.compact
    end
  rescue JSON::ParserError, TypeError
    []
  end

  def browser_details
    detection = Browser.new(request.user_agent.to_s)
    platform = detection.platform

    {
      browser: detection.name.to_s.presence,
      browser_version: detection.version.to_s.presence,
      operating_system: platform.name.to_s.presence || platform.id.to_s.presence,
      operating_system_version: platform.version.to_s.presence
    }
  rescue StandardError => e
    Rails.logger.debug("Bug report browser detection failed: #{e.class}: #{e.message}")
    {}
  end
end
