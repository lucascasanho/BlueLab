# frozen_string_literal: true

chunk_size_mb = Integer(ENV.fetch('RESUMABLE_MEDIA_CHUNK_SIZE_MB', '64'), 10)

raise 'RESUMABLE_MEDIA_CHUNK_SIZE_MB must be between 8 and 64' unless (8..64).cover?(chunk_size_mb)

Rails.application.config.x.resumable_media_uploads.tap do |config|
  config.enabled = ENV['RESUMABLE_MEDIA_UPLOADS_ENABLED'] == 'true'
  config.chunk_size = chunk_size_mb.megabytes
  config.storage_path = Rails.root.join('tmp', 'resumable_media_uploads')
end
