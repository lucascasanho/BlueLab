# frozen_string_literal: true

module Admin
  class SoftwareUpdatesController < BaseController
    before_action :check_enabled!

    def index
      authorize :software_update, :index?
      @software_updates = SoftwareUpdate.by_version.filter(&:pending?)
      @upstream_update_batches = UpstreamUpdateBatch.for_source(upstream_repository, upstream_channel).recent_first.limit(20)
      @upstream_update_check = UpstreamUpdateCheck.find_by(repository: upstream_repository, channel: upstream_channel)
    end

    def review_upstream
      authorize :software_update, :index?
      UpstreamUpdateBatch.for_source(upstream_repository, upstream_channel).pending_review.find(params.require(:batch_id)).update!(reviewed_at: Time.current)
      redirect_to admin_software_updates_path, notice: I18n.t('admin.software_updates.upstream.reviewed')
    end

    private

    def check_enabled!
      not_found unless SoftwareUpdate.check_enabled? || UpstreamUpdateBatch.check_enabled?
    end

    def upstream_repository
      Rails.configuration.x.mastodon.upstream_repository
    end

    def upstream_channel
      Rails.configuration.x.mastodon.upstream_channel
    end
  end
end
