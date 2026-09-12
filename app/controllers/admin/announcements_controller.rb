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

    @announcement = Announcement.new
  end

  def edit
    authorize :announcement, :update?
  end

  def create
    authorize :announcement, :create?

    @announcement = Announcement.new(resource_attributes)
    assign_media_attachments

    if @announcement.save
      PublishScheduledAnnouncementWorker.perform_async(@announcement.id) if @announcement.published?
      log_action :create, @announcement
      redirect_to admin_announcements_path, notice: @announcement.published? ? I18n.t('admin.announcements.published_msg') : I18n.t('admin.announcements.scheduled_msg')
    else
      render :new
    end
  end

  def update
    authorize :announcement, :update?

    @announcement.assign_attributes(resource_attributes)
    assign_media_attachments

    if @announcement.save
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

  def resource_attributes
    resource_params.except(:media_attachment_ids)
  end

  def resource_params
    @resource_params ||= params.expect(
      announcement: [:text, :scheduled_at, :starts_at, :ends_at, :all_day, :markdown_enabled, media_attachment_ids: []]
    )
  end

  def assign_media_attachments
    requested_ids = Array(resource_params[:media_attachment_ids]).compact_blank
    allowed_attachments = current_account.media_attachments
                                         .where(id: requested_ids, status_id: nil, scheduled_status_id: nil)
                                         .where(announcement_id: [nil, @announcement.id])

    @announcement.media_attachments = allowed_attachments
  end
end
