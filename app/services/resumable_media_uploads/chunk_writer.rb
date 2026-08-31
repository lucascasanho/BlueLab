# frozen_string_literal: true

class ResumableMediaUploads::ChunkWriter
  BUFFER_SIZE = 1.megabyte

  Result = Data.define(:created, :part)

  def initialize(upload, index:, body:, content_length:, checksum:)
    @upload = upload
    @index = parse_index(index)
    @body = body
    @content_length = parse_content_length(content_length)
    @checksum = normalize_checksum(checksum)
    @temporary_path = nil
  end

  def call
    validate_request!
    prepare_directory!
    write_and_verify_temporary_chunk!
    persist_chunk!
  ensure
    FileUtils.rm_f(@temporary_path) if @temporary_path
  end

  private

  def parse_index(index)
    index.is_a?(String) ? Integer(index, 10) : Integer(index)
  rescue ArgumentError, TypeError
    raise ResumableMediaUploads::BadRequestError, 'invalid_chunk_index'
  end

  def parse_content_length(content_length)
    content_length.is_a?(String) ? Integer(content_length, 10) : Integer(content_length)
  rescue ArgumentError, TypeError
    raise ResumableMediaUploads::BadRequestError, 'content_length_required'
  end

  def normalize_checksum(checksum)
    value = checksum.to_s.downcase
    raise ResumableMediaUploads::BadRequestError, 'invalid_checksum' unless /\A[0-9a-f]{64}\z/.match?(value)

    value
  end

  def validate_request!
    expected_size = @upload.expected_part_size(@index)
    raise ResumableMediaUploads::BadRequestError, 'invalid_chunk_index' if expected_size.nil?
    raise ResumableMediaUploads::BadRequestError, 'invalid_chunk_size' unless @content_length == expected_size
    raise ResumableMediaUploads::ConflictError, 'upload_not_active' unless @upload.state_active?
    raise ResumableMediaUploads::ConflictError, 'upload_expired' if @upload.expired?
  end

  def prepare_directory!
    FileUtils.mkdir_p(@upload.storage_directory, mode: 0o700)
    File.chmod(0o700, @upload.storage_directory)
    @temporary_path = @upload.storage_directory.join("chunk-#{@index}-#{SecureRandom.hex(12)}.tmp")
  end

  def write_and_verify_temporary_chunk!
    digest = Digest::SHA256.new
    remaining = @content_length

    File.open(@temporary_path, File::WRONLY | File::CREAT | File::EXCL, 0o600) do |file|
      file.binmode
      while remaining.positive?
        data = @body.read([remaining, BUFFER_SIZE].min)
        raise ResumableMediaUploads::BadRequestError, 'truncated_chunk' if data.blank?

        remaining -= data.bytesize
        raise ResumableMediaUploads::BadRequestError, 'chunk_too_large' if remaining.negative?

        digest.update(data)
        file.write(data)
      end

      raise ResumableMediaUploads::BadRequestError, 'chunk_too_large' if @body.read(1).present?

      file.flush
      file.fsync
    end

    return if ActiveSupport::SecurityUtils.secure_compare(digest.hexdigest, @checksum)

    raise ResumableMediaUploads::ChecksumMismatchError, 'checksum_mismatch'
  end

  def persist_chunk!
    result = nil

    @upload.with_lock do
      raise ResumableMediaUploads::ConflictError, 'upload_not_active' unless @upload.state_active?
      raise ResumableMediaUploads::ConflictError, 'upload_expired' if @upload.expired?

      existing = @upload.parts.find_by(part_index: @index)
      if existing
        if existing.byte_size == @content_length && ActiveSupport::SecurityUtils.secure_compare(existing.sha256, @checksum)
          @upload.refresh_expiration!
          result = Result.new(created: false, part: existing)
          next
        end

        raise ResumableMediaUploads::ConflictError, 'inconsistent_duplicate_chunk'
      end

      merge_into_staging_file!
      part = @upload.parts.create!(part_index: @index, byte_size: @content_length, sha256: @checksum)
      @upload.refresh_expiration!
      result = Result.new(created: true, part: part)
    end

    result
  end

  def merge_into_staging_file!
    File.open(@upload.lock_path, File::RDWR | File::CREAT, 0o600) do |lock_file|
      lock_file.flock(File::LOCK_EX)

      File.open(@upload.staging_path, File::RDWR | File::CREAT, 0o600) do |staging|
        staging.binmode
        staging.seek(@index * @upload.chunk_size)
        File.open(@temporary_path, 'rb') do |source|
          written = IO.copy_stream(source, staging, @content_length)
          raise IOError, 'Incomplete staging write' unless written == @content_length
        end
        staging.flush
        staging.fsync
      end
    ensure
      lock_file&.flock(File::LOCK_UN)
    end
  rescue Errno::ENOSPC
    raise ResumableMediaUploads::ResourceLimitError, 'insufficient_storage'
  end
end
