# frozen_string_literal: true

class ResumableMediaUploadPart < ApplicationRecord
  belongs_to :resumable_media_upload, inverse_of: :parts

  validates :part_index, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :byte_size, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 64.megabytes }
  validates :sha256, presence: true, format: { with: /\A[0-9a-f]{64}\z/ }
  validates :part_index, uniqueness: { scope: :resumable_media_upload_id }
  validate :index_and_size_match_upload

  private

  def index_and_size_match_upload
    return if resumable_media_upload.blank? || part_index.blank? || byte_size.blank?

    expected_size = resumable_media_upload.expected_part_size(part_index)
    errors.add(:part_index, :invalid) if expected_size.nil?
    errors.add(:byte_size, :invalid) if expected_size.present? && byte_size != expected_size
  end
end
