# frozen_string_literal: true

class Api::V1::Blue::BaseController < Api::BaseController
  before_action -> { doorkeeper_authorize! :write, :'write:media' }
  before_action :require_user!
  before_action :require_resumable_media_uploads_enabled!

  rescue_from ResumableMediaUploads::BadRequestError do |error|
    render_upload_error(error, :bad_request)
  end

  rescue_from ResumableMediaUploads::ChecksumMismatchError do |error|
    render_upload_error(error, :unprocessable_content)
  end

  rescue_from ResumableMediaUploads::IncompleteError do |error|
    render_upload_error(error, :unprocessable_content)
  end

  rescue_from ResumableMediaUploads::ConflictError do |error|
    render_upload_error(error, :conflict)
  end

  rescue_from ResumableMediaUploads::ResourceLimitError do |error|
    status = error.code == 'insufficient_storage' ? :insufficient_storage : :unprocessable_content
    render_upload_error(error, status)
  end

  private

  def require_resumable_media_uploads_enabled!
    render json: { error: 'Record not found' }, status: 404 unless ResumableMediaUpload.enabled?
  end

  def render_upload_error(error, status)
    render json: { error: error.message, code: error.code }, status: status
  end
end
