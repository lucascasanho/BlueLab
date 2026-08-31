# frozen_string_literal: true

class FinalizeResumableMediaUploadWorker
  include Sidekiq::Worker

  sidekiq_options retry: 2, dead: false, lock: :until_executed, lock_ttl: 3.hours.to_i

  sidekiq_retries_exhausted do |message|
    upload = ResumableMediaUpload.find_by(public_id: message['args'].first)
    next if upload.nil?

    should_clean = false
    upload.with_lock do
      next unless upload.state_finalizing?

      upload.update!(state: :failed, error_code: 'finalization_failed', expires_at: ResumableMediaUpload::EXPIRATION.from_now)
      should_clean = true
    end
    next unless should_clean

    upload.safely_remove_storage!
  rescue => e
    Sidekiq.logger.error("Unable to clean failed resumable upload: #{e.class}: #{e.message}")
  end

  def perform(public_id)
    upload = ResumableMediaUpload.find_by!(public_id: public_id)
    return unless upload.state_finalizing?

    Rails.logger.info(
      "resumable_media_upload event=finalization_started upload_id=#{upload.public_id} " \
      "account_id=#{upload.account_id} expected_size=#{upload.expected_size}"
    )

    media_attachment = ResumableMediaUploads::Finalizer.new(upload).call
    return if media_attachment.nil?

    Rails.logger.info(
      "resumable_media_upload event=completed upload_id=#{upload.public_id} " \
      "account_id=#{upload.account_id} media_attachment_id=#{media_attachment.id}"
    )
  rescue ActiveRecord::RecordNotFound
    true
  end
end
