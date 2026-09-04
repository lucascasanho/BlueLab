# frozen_string_literal: true

Fabricator(:resumable_media_upload) do
  account
  original_filename { 'video.mp4' }
  declared_content_type { 'video/mp4' }
  expected_size { 8 }
  chunk_size { 4 }
  chunk_count { 2 }
end
