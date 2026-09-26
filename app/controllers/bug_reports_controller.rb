# frozen_string_literal: true

class BugReportsController < ApplicationController
  def new
    @error_page = valid_error_page(params[:error_page])
    @current_path = sanitize_path(params[:current_path]) || request.path
    @interface_layout = @error_page.present? ? 'error' : 'auth'
  end

  def create
    @error_page = valid_error_page(params[:error_page])
    @current_path = sanitize_path(params[:current_path]) || request.path
    @interface_layout = @error_page.present? ? 'error' : 'auth'

    @bug_report = BugReport.new(
      account: current_account,
      description: params[:description],
      browser: browser_details[:browser],
      browser_version: browser_details[:browser_version],
      operating_system: browser_details[:operating_system],
      operating_system_version: browser_details[:operating_system_version],
      interface_language: params[:interface_language].presence || I18n.locale.to_s,
      theme: params[:theme].presence || current_theme,
      interface_layout: params[:interface_layout].presence || @interface_layout,
      current_path: @current_path,
      error_page: @error_page,
      viewport: params[:viewport].presence,
      app_version: params[:app_version].presence || Rails.configuration.x.mastodon.version,
      request_id: request.request_id,
      user_agent: request.user_agent.to_s.truncate(2_000),
      client_errors: client_errors
    )

    @bug_report.save!

    Array(params[:files]).compact_blank.first(BugReport::MAX_ATTACHMENTS).each do |file|
      @bug_report.media_attachments.create!(
        account: current_account,
        file: file,
        delay_processing: true
      )
    end

    render :success
  rescue ActiveRecord::RecordInvalid, Paperclip::Error, Mastodon::DimensionsValidationError, Mastodon::StreamValidationError => e
    @bug_report&.destroy
    Rails.logger.warn("Bug report rejected: #{e.class}: #{e.message}")
    render :new, status: :unprocessable_content
  end

  private

  def sanitize_path(value)
    value.to_s.split('?').first.truncate(500).presence
  end

  def valid_error_page(value)
    value.to_s.match?(/\A\d{3}\z/) ? value.to_s : nil
  end

  def client_errors
    raw = params[:client_errors].to_s
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
