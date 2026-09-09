# frozen_string_literal: true

module Api::ScheduledPostParamsConcern
  extend ActiveSupport::Concern

  private

  def normalized_scheduled_item(item_params)
    values = item_params.to_h.symbolize_keys
    values[:text] = values.delete(:status).to_s
    values[:thread] = resolve_scheduled_reference(values.delete(:in_reply_to_id), :show?)
    values[:quoted_status] = resolve_scheduled_reference(values.delete(:quoted_status_id), :quote?)&.proper
    values[:quote_approval_policy] = scheduled_quote_policy(values.delete(:quote_approval_policy))
    values
  end

  def resolve_scheduled_reference(id, policy)
    return if id.blank?

    status = Status.find(id)
    authorize(status, policy)
    status
  rescue ActiveRecord::RecordNotFound, Mastodon::NotPermittedError
    raise Mastodon::ValidationError, I18n.t('statuses.errors.in_reply_not_found')
  end

  def scheduled_quote_policy(value)
    case value.presence || current_user.setting_default_quote_policy
    when 'public'
      InteractionPolicy::POLICY_FLAGS[:public] << 16
    when 'followers'
      InteractionPolicy::POLICY_FLAGS[:followers] << 16
    when 'nobody'
      0
    else
      raise ActiveRecord::RecordInvalid
    end
  end

  def scheduled_item_params
    [
      :status,
      :in_reply_to_id,
      :quoted_status_id,
      :quote_approval_policy,
      :sensitive,
      :spoiler_text,
      :visibility,
      :language,
      :content_type,
      { allowed_mentions: [], media_ids: [], poll: [:multiple, :hide_totals, :expires_in, { options: [] }] },
    ]
  end
end
