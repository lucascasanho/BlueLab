# frozen_string_literal: true

class Vacuum::ResumableMediaUploadsVacuum
  def perform
    expire_stale_finalizations!

    ResumableMediaUpload.past_expiration.find_each do |upload|
      remove_upload!(upload)
    rescue => e
      Rails.logger.error(
        "resumable_media_upload event=cleanup_failed upload_id=#{upload.public_id} " \
        "error_class=#{e.class}"
      )
    end
  end

  private

  def expire_stale_finalizations!
    ResumableMediaUpload
      .where(state: :finalizing)
      .where(updated_at: ...ResumableMediaUpload::FINALIZATION_TIMEOUT.ago)
      .update_all(
        state: ResumableMediaUpload.states[:failed],
        error_code: 'finalization_timeout',
        expires_at: Time.current,
        updated_at: Time.current
      )
  end

  def remove_upload!(upload)
    public_id = upload.public_id
    account_id = upload.account_id

    upload.with_lock do
      return if upload.state_finalizing? && upload.updated_at >= ResumableMediaUpload::FINALIZATION_TIMEOUT.ago

      upload.update!(state: :expired) unless upload.state_completed?
    end

    upload.safely_remove_storage!
    upload.destroy!

    Rails.logger.info(
      "resumable_media_upload event=expired upload_id=#{public_id} account_id=#{account_id}"
    )
  end
end
