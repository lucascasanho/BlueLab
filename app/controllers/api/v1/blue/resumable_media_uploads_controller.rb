# frozen_string_literal: true

class Api::V1::Blue::ResumableMediaUploadsController < Api::V1::Blue::BaseController
  before_action :set_upload, except: :create

  def show
    render_upload(@upload, @upload.state_finalizing? ? :accepted : :ok)
  end

  def create
    upload = ResumableMediaUploads::CreateService.new.call(
      current_account,
      filename: params[:filename],
      size: params[:size],
      content_type: params[:content_type]
    )

    Rails.logger.info(
      "resumable_media_upload event=created upload_id=#{upload.public_id} account_id=#{current_account.id} " \
      "expected_size=#{upload.expected_size} chunk_count=#{upload.chunk_count}"
    )

    render_upload(upload, :created)
  end

  def complete
    status = :accepted
    should_enqueue = false

    @upload.with_lock do
      if @upload.state_completed?
        status = :ok
        next
      end

      raise ResumableMediaUploads::ConflictError, 'upload_not_active' unless @upload.state_active? || @upload.state_finalizing?
      raise ResumableMediaUploads::ConflictError, 'upload_expired' if @upload.expired?

      if @upload.state_active?
        raise ResumableMediaUploads::IncompleteError, 'incomplete_upload' unless @upload.complete_parts?

        @upload.update!(state: :finalizing, error_code: nil, expires_at: Time.current + ResumableMediaUpload::FINALIZATION_TIMEOUT)
        should_enqueue = true
      end
    end

    enqueue_finalization! if should_enqueue
    render_upload(@upload.reload, status)
  end

  def destroy
    @upload.with_lock do
      raise ResumableMediaUploads::ConflictError, 'upload_already_completed' if @upload.state_completed?

      @upload.update!(state: :canceled, expires_at: Time.current)
    end

    public_id = @upload.public_id
    @upload.safely_remove_storage!
    @upload.destroy!

    Rails.logger.info(
      "resumable_media_upload event=canceled upload_id=#{public_id} account_id=#{current_account.id}"
    )

    render_empty
  end

  private

  def set_upload
    @upload = current_account.resumable_media_uploads.find_by!(public_id: params[:id])
  end

  def enqueue_finalization!
    FinalizeResumableMediaUploadWorker.perform_async(@upload.public_id)
  rescue
    @upload.with_lock do
      @upload.update!(state: :active, expires_at: Time.current + ResumableMediaUpload::EXPIRATION) if @upload.state_finalizing?
    end
    raise
  end

  def render_upload(upload, status)
    render json: upload,
           serializer: REST::ResumableMediaUploadSerializer,
           status: status
  end
end
