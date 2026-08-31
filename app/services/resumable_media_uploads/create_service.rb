# frozen_string_literal: true

require 'open3'

class ResumableMediaUploads::CreateService < BaseService
  GLOBAL_ADVISORY_LOCK_ID = 7_263_778_411

  def call(account, filename:, size:, content_type: nil)
    @account = account
    @filename = normalize_filename(filename)
    @expected_size = parse_size(size)
    @content_type = content_type.to_s.presence
    @chunk_size = Rails.configuration.x.resumable_media_uploads.chunk_size
    @chunk_count = (@expected_size + @chunk_size - 1) / @chunk_size

    validate_extension!
    validate_size!
    validate_chunk_count!
    prepare_storage_root!

    ResumableMediaUpload.transaction do
      ResumableMediaUpload.connection.execute("SELECT pg_advisory_xact_lock(#{GLOBAL_ADVISORY_LOCK_ID})")
      validate_database_quotas!

      @account.resumable_media_uploads.create!(
        original_filename: @filename,
        declared_content_type: @content_type,
        expected_size: @expected_size,
        chunk_size: @chunk_size,
        chunk_count: @chunk_count
      )
    end
  rescue Errno::ENOSPC
    raise ResumableMediaUploads::ResourceLimitError, 'insufficient_storage'
  end

  private

  def normalize_filename(filename)
    value = filename.to_s.delete("\0").tr('\\', '/')
    value = File.basename(value).strip
    raise ResumableMediaUploads::BadRequestError, 'invalid_filename' if value.blank? || value.length > 255

    value
  end

  def parse_size(size)
    parsed = size.is_a?(String) ? Integer(size, 10) : Integer(size)
    raise ArgumentError if parsed <= 0

    parsed
  rescue ArgumentError, TypeError
    raise ResumableMediaUploads::BadRequestError, 'invalid_size'
  end

  def validate_extension!
    extension = File.extname(@filename).downcase
    return if MediaAttachment.supported_file_extensions.include?(extension)

    raise ResumableMediaUploads::BadRequestError, 'unsupported_extension'
  end

  def validate_size!
    extension = File.extname(@filename).downcase
    limit = MediaAttachment::IMAGE_FILE_EXTENSIONS.include?(extension) ? MediaAttachment.image_limit : MediaAttachment.video_limit

    raise ResumableMediaUploads::ResourceLimitError, 'file_too_large' if @expected_size >= limit
  end

  def validate_chunk_count!
    return if @chunk_count.between?(1, ResumableMediaUpload::MAX_CHUNKS)

    raise ResumableMediaUploads::ResourceLimitError, 'too_many_chunks'
  end

  def prepare_storage_root!
    root = ResumableMediaUpload.storage_root
    FileUtils.mkdir_p(root, mode: 0o700)
    File.chmod(0o700, root)
  end

  def validate_disk_space!(reserved_bytes)
    output, status = Open3.capture2('df', '-Pk', ResumableMediaUpload.storage_root.to_s)
    raise ResumableMediaUploads::ResourceLimitError, 'storage_unavailable' unless status.success?

    fields = output.lines.last.to_s.split
    available_bytes = Integer(fields.fetch(3), 10) * 1024
    # Keep room for both the staging file and the copy Paperclip needs while it
    # hands the completed upload to the normal media storage pipeline.
    required_bytes = ((reserved_bytes + @expected_size) * 2) + ResumableMediaUpload::MIN_FREE_BYTES

    raise ResumableMediaUploads::ResourceLimitError, 'insufficient_storage' if available_bytes < required_bytes
  rescue ArgumentError, IndexError
    raise ResumableMediaUploads::ResourceLimitError, 'storage_unavailable'
  end

  def validate_database_quotas!
    in_progress = ResumableMediaUpload.in_progress

    raise ResumableMediaUploads::ResourceLimitError, 'account_upload_limit' if in_progress.where(account_id: @account.id).count >= ResumableMediaUpload::MAX_ACTIVE_PER_ACCOUNT

    raise ResumableMediaUploads::ResourceLimitError, 'global_upload_limit' if in_progress.count >= ResumableMediaUpload::MAX_ACTIVE_GLOBAL

    reserved_bytes = in_progress.sum(:expected_size)
    raise ResumableMediaUploads::ResourceLimitError, 'temporary_storage_limit' if reserved_bytes + @expected_size > ResumableMediaUpload::MAX_RESERVED_BYTES

    validate_disk_space!(reserved_bytes)
  end
end
