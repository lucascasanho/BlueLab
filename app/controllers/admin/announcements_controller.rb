# frozen_string_literal: true

class Admin::AnnouncementsController < Admin::BaseController
  before_action :set_announcements, only: :index
  before_action :set_announcement, except: [:index, :new, :create]
  before_action :set_editor_data, only: [:new, :edit, :create, :update]

  def index
    authorize :announcement, :index?
    @published_announcements_count = Announcement.published.async_count
  end

  def new
    authorize :announcement, :create?

    @announcement = Announcement.new(content_type: 'text/markdown')
  end

  def edit
    authorize :announcement, :update?
  end

  def create
    authorize :announcement, :create?

    @announcement = Announcement.new(resource_params)

    if save_with_media
      PublishScheduledAnnouncementWorker.perform_async(@announcement.id) if @announcement.published?
      log_action :create, @announcement
      redirect_to admin_announcements_path, notice: @announcement.published? ? I18n.t('admin.announcements.published_msg') : I18n.t('admin.announcements.scheduled_msg')
    else
      render :new, status: :unprocessable_content
    end
  end

  def update
    authorize :announcement, :update?

    @announcement.assign_attributes(resource_params)

    if save_with_media
      PublishScheduledAnnouncementWorker.perform_async(@announcement.id) if @announcement.published?
      log_action :update, @announcement
      redirect_to admin_announcements_path, notice: I18n.t('admin.announcements.updated_msg')
    else
      render :edit, status: :unprocessable_content
    end
  end

  def publish
    authorize :announcement, :update?
    @announcement.publish!
    PublishScheduledAnnouncementWorker.perform_async(@announcement.id)
    log_action :update, @announcement
    redirect_to admin_announcements_path, notice: I18n.t('admin.announcements.published_msg')
  end

  def unpublish
    authorize :announcement, :update?
    @announcement.unpublish!
    UnpublishAnnouncementWorker.perform_async(@announcement.id)
    log_action :update, @announcement
    redirect_to admin_announcements_path, notice: I18n.t('admin.announcements.unpublished_msg')
  end

  def destroy
    authorize :announcement, :destroy?
    @announcement.destroy!
    UnpublishAnnouncementWorker.perform_async(@announcement.id) if @announcement.published?
    log_action :destroy, @announcement
    redirect_to admin_announcements_path, notice: I18n.t('admin.announcements.destroyed_msg')
  end

  private

  def set_announcements
    @announcements = AnnouncementFilter.new(filter_params).results.reverse_chronological.page(params[:page])
  end

  def set_announcement
    @announcement = Announcement.find(params[:id])
  end

  def set_editor_data
    @announcement_editor_emojis = CustomEmoji.listed.alphabetic.map do |emoji|
      {
        shortcode: emoji.shortcode,
        url: view_context.full_asset_url(emoji.image.url),
        static_url: view_context.full_asset_url(emoji.image.url(:static)),
      }
    end
  end

  def filter_params
    params.slice(*AnnouncementFilter::KEYS).permit(*AnnouncementFilter::KEYS)
  end

  def announcement_params
    @announcement_params ||= params.expect(
      announcement: [
        :text,
        :content_type,
        :scheduled_at,
        :starts_at,
        :ends_at,
        :all_day,
        { media_files: [], remove_media_attachment_ids: [] },
      ]
    )
  end

  def resource_params
    announcement_params.except(:media_files, :remove_media_attachment_ids)
  end

  def media_files
    Array(announcement_params[:media_files]).compact_blank
  end

  def media_attachment_ids_to_remove
    Array(announcement_params[:remove_media_attachment_ids]).compact_blank
  end

  def media_count_valid?
    retained_count = @announcement.media_attachments.where.not(id: media_attachment_ids_to_remove).count
    requested_count = retained_count + media_files.size
    return true if requested_count <= Announcement::MAX_MEDIA_ATTACHMENTS

    @announcement.errors.add(:media_attachments, :too_long, count: Announcement::MAX_MEDIA_ATTACHMENTS)
    false
  end

  def save_with_media
    return false unless media_count_valid?

    Announcement.transaction do
      @announcement.save!
      @announcement.media_attachments.where(id: media_attachment_ids_to_remove).destroy_all

      media_files.each do |upload|
        @announcement.media_attachments.create!(
          account: current_account,
          file: upload,
          delay_processing: true
        )
      end
    end

    true
  rescue ActiveRecord::RecordInvalid => e
    @announcement.errors.add(:media_attachments, e.record.errors.full_messages.to_sentence) unless e.record == @announcement
    false
  end
end
