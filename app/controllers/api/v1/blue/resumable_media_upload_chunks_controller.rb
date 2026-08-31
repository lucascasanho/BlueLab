# frozen_string_literal: true

class Api::V1::Blue::ResumableMediaUploadChunksController < Api::V1::Blue::BaseController
  before_action :set_upload

  def update
    raise ResumableMediaUploads::BadRequestError, 'invalid_content_type' unless request.media_type == 'application/octet-stream'

    result = ResumableMediaUploads::ChunkWriter.new(
      @upload,
      index: params[:index],
      body: request.body,
      content_length: request.content_length,
      checksum: request.headers['X-Chunk-SHA256']
    ).call

    attempt = params_or_header_attempt
    Rails.logger.info(
      "resumable_media_upload event=chunk_received upload_id=#{@upload.public_id} " \
      "account_id=#{current_account.id} chunk_index=#{result.part.part_index} " \
      "chunk_size=#{result.part.byte_size} duplicate=#{!result.created} attempt=#{attempt}"
    )

    render json: {
      index: result.part.part_index,
      uploaded_bytes: @upload.uploaded_bytes,
      duplicate: !result.created,
    }, status: result.created ? :created : :ok
  end

  private

  def set_upload
    @upload = current_account.resumable_media_uploads.find_by!(public_id: params[:id])
  end

  def params_or_header_attempt
    Integer(request.headers['X-Upload-Attempt'] || 1, 10).clamp(1, 100)
  rescue ArgumentError, TypeError
    1
  end
end
