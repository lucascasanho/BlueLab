# frozen_string_literal: true

class ResumableMediaUploads::Finalizer
  BUFFER_SIZE = 1.megabyte

  def initialize(upload)
    @upload = upload
  end

  def call
    verify_state!
    full_checksum = verify_staging_file!
    media_attachment = build_media_attachment!

    ResumableMediaUpload.transaction do
      @upload.lock!
      raise ResumableMediaUploads::ConflictError, 'upload_not_finalizing' unless @upload.state_finalizing?

      media_attachment.save!
      @upload.parts.delete_all
      @upload.update!(
        state: :completed,
        media_attachment: media_attachment,
        sha256: full_checksum,
        completed_at: Time.current,
        expires_at: Time.current + ResumableMediaUpload::COMPLETED_RETENTION,
        error_code: nil
      )
    end

    @upload.safely_remove_storage!
    media_attachment
  rescue ActiveRecord::RecordInvalid,
         Mastodon::DimensionsValidationError,
         Mastodon::StreamValidationError,
         Paperclip::Errors::NotIdentifiedByImageMagickError => e
    fail_permanently!('invalid_media', e)
    nil
  rescue ResumableMediaUploads::PermanentError => e
    fail_permanently!(e.code, e)
    nil
  ensure
    @source_file&.close
  end

  private

  def verify_state!
    @upload.reload
    raise ResumableMediaUploads::ConflictError, 'upload_not_finalizing' unless @upload.state_finalizing?
  end

  def verify_staging_file!
    parts = @upload.parts.order(:part_index).to_a
    expected_indexes = (0...@upload.chunk_count).to_a

    raise ResumableMediaUploads::PermanentError, 'incomplete_upload' unless parts.map(&:part_index) == expected_indexes && parts.sum(&:byte_size) == @upload.expected_size

    stat = File.lstat(@upload.staging_path)
    raise ResumableMediaUploads::PermanentError, 'invalid_staging_file' unless stat.file? && stat.size == @upload.expected_size

    full_digest = Digest::SHA256.new

    File.open(@upload.staging_path, 'rb') do |file|
      parts.each do |part|
        part_digest = Digest::SHA256.new
        remaining = part.byte_size

        while remaining.positive?
          data = file.read([remaining, BUFFER_SIZE].min)
          raise ResumableMediaUploads::PermanentError, 'truncated_staging_file' if data.blank?

          remaining -= data.bytesize
          part_digest.update(data)
          full_digest.update(data)
        end

        raise ResumableMediaUploads::PermanentError, 'staging_checksum_mismatch' unless ActiveSupport::SecurityUtils.secure_compare(part_digest.hexdigest, part.sha256)
      end

      raise ResumableMediaUploads::PermanentError, 'oversized_staging_file' if file.read(1).present?
    end

    full_digest.hexdigest
  rescue Errno::ENOENT
    raise ResumableMediaUploads::PermanentError, 'missing_staging_file'
  end

  def build_media_attachment!
    @source_file = File.open(@upload.staging_path, 'rb')
    uploaded_file = ActionDispatch::Http::UploadedFile.new(
      tempfile: @source_file,
      filename: @upload.original_filename,
      type: @upload.declared_content_type || 'application/octet-stream'
    )

    media_attachment = @upload.account.media_attachments.build(
      file: uploaded_file,
      delay_processing: true
    )
    media_attachment.validate!
    media_attachment
  end

  def fail_permanently!(code, exception)
    Rails.logger.warn(
      "resumable_media_upload event=finalization_failed upload_id=#{@upload.public_id} " \
      "account_id=#{@upload.account_id} code=#{code} error_class=#{exception.class}"
    )

    @upload.with_lock do
      @upload.parts.delete_all
      @upload.update!(state: :failed, error_code: code, expires_at: Time.current + ResumableMediaUpload::EXPIRATION)
    end
    @upload.safely_remove_storage!
  end
end
