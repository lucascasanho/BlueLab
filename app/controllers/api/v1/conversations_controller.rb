# frozen_string_literal: true

class Api::V1::ConversationsController < Api::BaseController
  LIMIT = 20

  before_action -> { doorkeeper_authorize! :read, :'read:statuses' }, only: [:index, :show, :messages, :by_status]
  before_action -> { doorkeeper_authorize! :write, :'write:conversations' }, except: [:index, :messages, :by_status]
  before_action :require_user!
  before_action :set_conversation, except: [:index, :by_status]
  after_action :insert_pagination_headers, only: :index

  def index
    @conversations = paginated_conversations
    hydrate_conversation_participants!

    render json: @conversations,
           each_serializer: REST::ConversationSerializer,
           relationships: StatusRelationshipsPresenter.new(@conversations.map(&:last_status), current_user&.account_id)
  end

  def show
    conversation = matching_conversations
      .includes(account: [:account_stat, user: :role], last_status: [:media_attachments, :status_stat, :tags, :active_mentions, { account: [:account_stat, user: :role] }])
      .order(last_status_id: :desc)
      .first

    return head :not_found unless conversation

    conversation.participant_accounts = matching_conversations
      .flat_map(&:participant_accounts)
      .uniq { |account| account.id }

    render json: conversation,
           serializer: REST::ConversationSerializer,
           relationships: StatusRelationshipsPresenter.new([conversation.last_status], current_user&.account_id)
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

  def by_status
    conversation = AccountConversation.where(account: current_account)
      .where('? = ANY(status_ids)', params[:status_id].to_i)
      .order(last_status_id: :desc)
      .first

    return head :not_found unless conversation

    render json: { id: conversation.id.to_s }
  end

  def unread
    matching_conversations.update_all(unread: true, updated_at: Time.current)
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
    account_conversations = AccountConversation.where(account: current_account)

    if @conversation.conversation_id.present?
      account_conversations.where(conversation_id: @conversation.conversation_id)
    else
      account_conversations.where(id: @conversation.id)
    end
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
    latest_per_thread = AccountConversation
      .where(account: current_account)
      .select("DISTINCT ON (conversation_id) id")
      .order(Arel.sql('conversation_id, last_status_id DESC, id DESC'))

    AccountConversation
      .where(id: latest_per_thread)
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

  def hydrate_conversation_participants!
    return if @conversations.empty?

    conversation_ids = @conversations.map(&:conversation_id)
    participant_ids_by_conversation = AccountConversation
      .where(account: current_account, conversation_id: conversation_ids)
      .pluck(:conversation_id, :participant_account_ids)
      .each_with_object(Hash.new { |hash, key| hash[key] = [] }) do |(conversation_id, ids), result|
        result[conversation_id].concat(ids)
      end

    participant_ids = participant_ids_by_conversation.values.flatten.uniq
    accounts_by_id = Account.where(id: participant_ids).index_by(&:id)

    @conversations.each do |conversation|
      conversation.participant_accounts = participant_ids_by_conversation[conversation.conversation_id]
        .uniq
        .filter_map { |account_id| accounts_by_id[account_id] }
    end
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
