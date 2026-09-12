# frozen_string_literal: true

class Admin::AnnouncementsController < Admin::BaseController
  before_action :set_announcements, only: :index
  before_action :set_announcement, except: [:index, :new, :create]

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

    if save_with_media(@announcement)
      PublishScheduledAnnouncementWorker.perform_async(@announcement.id) if @announcement.published?
      log_action :create, @announcement
      redirect_to admin_announcements_path, notice: @announcement.published? ? I18n.t('admin.announcements.published_msg') : I18n.t('admin.announcements.scheduled_msg')
    else
      render :new
    end
  end

  def update
    authorize :announcement, :update?

    @announcement.assign_attributes(resource_params)

    if save_with_media(@announcement)
      PublishScheduledAnnouncementWorker.perform_async(@announcement.id) if @announcement.published?
      log_action :update, @announcement
      redirect_to admin_announcements_path, notice: I18n.t('admin.announcements.updated_msg')
    else
      render :edit
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

  def filter_params
    params.slice(*AnnouncementFilter::KEYS).permit(*AnnouncementFilter::KEYS)
  end

  def resource_params
    params
      .expect(announcement: [:text, :content_type, :scheduled_at, :starts_at, :ends_at, :all_day])
  end

  def requested_media_attachment_ids
    Array(params.dig(:announcement, :media_attachment_ids)).filter_map do |id|
      Integer(id, exception: false)
    end.uniq
  end

  def save_with_media(announcement)
    return false unless announcement.save

    attach_requested_media(announcement)
    true
  end

  def attach_requested_media(announcement)
    requested_ids = requested_media_attachment_ids
    owned_media = current_user.account.media_attachments.where(id: requested_ids)
    allowed_ids = owned_media.where(status_id: nil, scheduled_status_id: nil).where(announcement_id: [nil, announcement.id]).pluck(:id)

    announcement.media_attachments.where.not(id: allowed_ids).update_all(announcement_id: nil)
    owned_media.where(id: allowed_ids).update_all(announcement_id: announcement.id)
    announcement.media_attachments.reset
  end
end
