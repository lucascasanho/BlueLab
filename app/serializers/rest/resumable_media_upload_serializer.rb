# frozen_string_literal: true

class REST::ResumableMediaUploadSerializer < ActiveModel::Serializer
  attributes :id, :state, :expected_size, :chunk_size, :chunk_count,
             :uploaded_bytes, :uploaded_chunks, :expires_at, :error,
             :media, :media_processing

  def id
    object.public_id
  end

  def uploaded_chunks
    object.uploaded_part_indexes
  end

  def error
    object.error_code
  end

  def media
    return if object.media_attachment.nil?

    ActiveModelSerializers::SerializableResource.new(
      object.media_attachment,
      serializer: REST::MediaAttachmentSerializer,
      scope: scope,
      scope_name: :current_user
    ).as_json
  end

  def media_processing
    object.media_attachment&.not_processed? || false
  end
end
