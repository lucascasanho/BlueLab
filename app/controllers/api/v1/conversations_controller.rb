# frozen_string_literal: true

class Api::V1::ConversationsController < Api::BaseController
  LIMIT = 20

  before_action -> { doorkeeper_authorize! :read, :'read:statuses' }, only: [:index, :messages]
  before_action -> { doorkeeper_authorize! :write, :'write:conversations' }, except: [:index, :messages]
  before_action :require_user!
  before_action :set_conversation, except: :index
  after_action :insert_pagination_headers, only: :index

  def index
    @conversations = paginated_conversations
    render json: @conversations, each_serializer: REST::ConversationSerializer, relationships: StatusRelationshipsPresenter.new(@conversations.map(&:last_status), current_user&.account_id)
  end

  def messages
    statuses = conversation_statuses

    render json: statuses,
           each_serializer: REST::StatusSerializer,
           relationships: StatusRelationshipsPresenter.new(statuses, current_user&.account_id)
  end

  def read
    matching_conversations.update_all(unread: false, updated_at: Time.current)
    render json: @conversation, serializer: REST::ConversationSerializer
  end

  def unread
    @conversation.update!(unread: true)
    render json: @conversation, serializer: REST::ConversationSerializer
  end

  def destroy
    @conversation.destroy!
    render_empty
  end

  private

  def set_conversation
    @conversation = AccountConversation.where(account: current_account).find(params[:id])
  end

  def matching_conversations
    AccountConversation.where(
      account: current_account,
      participant_account_ids: @conversation.participant_account_ids
    )
  end

  def conversation_statuses
    status_ids = matching_conversations.pluck(:status_ids).flatten.uniq

    Status.where(id: status_ids)
      .includes(
        :media_attachments,
        :preloadable_poll,
        :status_stat,
        :tags,
        {
          preview_cards_status: { preview_card: { author_account: [:account_stat, user: :role] } },
          active_mentions: :account,
          account: [:account_stat, user: :role],
        }
      )
      .order(id: :asc)
  end

  def paginated_conversations
    AccountConversation.where(account: current_account)
      .includes(
        account: [:account_stat, user: :role],
        last_status: [
          :media_attachments,
          :status_stat,
          :tags,
          {
            preview_cards_status: { preview_card: { author_account: [:account_stat, user: :role] } },
            active_mentions: :account,
            account: [:account_stat, user: :role],
          },
        ]
      )
      .to_a_paginated_by_id(limit_param(LIMIT), params_slice(:max_id, :since_id, :min_id))
  end

  def next_path
    api_v1_conversations_url pagination_params(max_id: pagination_max_id) if records_continue?
  end

  def prev_path
    api_v1_conversations_url pagination_params(min_id: pagination_since_id) unless @conversations.empty?
  end

  def pagination_max_id
    @conversations.last.last_status_id
  end

  def pagination_since_id
    @conversations.first.last_status_id
  end

  def records_continue?
    @conversations.size == limit_param(LIMIT)
  end
end
