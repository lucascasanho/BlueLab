# frozen_string_literal: true

class REST::ScheduledThreadSerializer < ActiveModel::Serializer
  attributes :id, :scheduled_at, :state, :attempts, :next_retry_at, :last_error, :published_status_ids

  has_many :scheduled_statuses, key: :items, serializer: REST::ScheduledStatusSerializer

  def id
    object.id.to_s
  end

  def published_status_ids
    object.scheduled_statuses.filter_map { |item| item.published_status_id&.to_s }
  end
end
