# frozen_string_literal: true

class ResumableMediaUpload < ApplicationRecord
  EXPIRATION = 24.hours.freeze
  COMPLETED_RETENTION = 24.hours.freeze
  FINALIZATION_TIMEOUT = 2.hours.freeze
  MAX_ACTIVE_PER_ACCOUNT = 2
  MAX_ACTIVE_GLOBAL = 20
  MAX_RESERVED_BYTES = 20.gigabytes
  MIN_FREE_BYTES = 5.gigabytes
  MAX_CHUNKS = 128

  PUBLIC_ID_FORMAT = /\A[A-Za-z0-9_-]{32,64}\z/

  belongs_to :account, inverse_of: :resumable_media_uploads
  belongs_to :media_attachment, optional: true

  has_many :parts,
           class_name: 'ResumableMediaUploadPart',
           dependent: :delete_all,
           inverse_of: :resumable_media_upload

  enum :state, {
    active: 0,
    finalizing: 1,
    completed: 2,
    failed: 3,
    canceled: 4,
    expired: 5,
  }, prefix: true

  validates :public_id, presence: true, uniqueness: true, format: { with: PUBLIC_ID_FORMAT }
  validates :original_filename, presence: true, length: { maximum: 255 }
  validates :declared_content_type, length: { maximum: 255 }, allow_blank: true
  validates :sha256, format: { with: /\A[0-9a-f]{64}\z/ }, allow_blank: true
  validates :expected_size, numericality: { only_integer: true, greater_than: 0 }
  validates :chunk_size, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 64.megabytes }
  validates :chunk_count, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: MAX_CHUNKS }
  validates :last_activity_at, :expires_at, presence: true

  before_validation :set_creation_defaults, on: :create

  scope :in_progress, -> { where(state: [:active, :finalizing]) }
  scope :past_expiration, -> { where(expires_at: ...Time.current) }

  def self.enabled?
    Rails.configuration.x.resumable_media_uploads.enabled
  end

  def self.storage_root
    Pathname.new(Rails.configuration.x.resumable_media_uploads.storage_path).cleanpath
  end

  def self.generate_public_id
    SecureRandom.urlsafe_base64(32, false)
  end

  def storage_directory
    self.class.storage_root.join(public_id)
  end

  def staging_path
    storage_directory.join('upload.bin')
  end

  def lock_path
    storage_directory.join('upload.lock')
  end

  def expected_part_size(index)
    return unless index.between?(0, chunk_count - 1)

    [chunk_size, expected_size - (index * chunk_size)].min
  end

  def uploaded_bytes
    parts.sum(:byte_size)
  end

  def uploaded_part_indexes
    parts.order(:part_index).pluck(:part_index)
  end

  def complete_parts?
    parts.count == chunk_count && uploaded_bytes == expected_size
  end

  def refresh_expiration!
    now = Time.current
    update!(last_activity_at: now, expires_at: now + EXPIRATION)
  end

  def expired?
    expires_at <= Time.current
  end

  def safely_remove_storage!
    directory = storage_directory.cleanpath
    root = self.class.storage_root

    raise Mastodon::Error, 'Unsafe resumable upload path' unless directory.parent == root

    FileUtils.rm_rf(directory)
  end

  private

  def set_creation_defaults
    now = Time.current
    self.public_id ||= self.class.generate_public_id
    self.last_activity_at ||= now
    self.expires_at ||= now + EXPIRATION
  end
end
