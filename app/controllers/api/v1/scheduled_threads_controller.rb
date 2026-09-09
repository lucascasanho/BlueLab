# frozen_string_literal: true

class Api::V1::ScheduledThreadsController < Api::BaseController
  include Authorization
  include Api::ScheduledPostParamsConcern

  before_action -> { doorkeeper_authorize! :read, :'read:statuses' }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write, :'write:statuses' }, only: [:create, :update, :destroy, :retry]
  before_action :require_user!
  before_action :set_threads, only: :index
  before_action :set_thread, except: [:index, :create]

  after_action :insert_pagination_headers, only: :index

  def index
    render json: @threads, each_serializer: REST::ScheduledThreadSerializer
  end

  def show
    render json: @thread, serializer: REST::ScheduledThreadSerializer
  end

  def create
    @thread = CreateScheduledThreadService.new.call(
      current_account,
      items: normalized_items,
      scheduled_at: params[:scheduled_at],
      application: doorkeeper_token.application,
      idempotency: request.headers['Idempotency-Key']
    )
    render json: @thread, serializer: REST::ScheduledThreadSerializer
  end

  def update
    @thread = UpdateScheduledThreadService.new.call(
      @thread,
      items: params.key?(:items) ? normalized_items : nil,
      scheduled_at: params[:scheduled_at],
      application: doorkeeper_token.application
    )
    render json: @thread, serializer: REST::ScheduledThreadSerializer
  end

  def destroy
    @thread.destroy!
    render_empty
  end

  def retry
    @thread.update!(state: 'pending', next_retry_at: nil, last_error: nil)
    PublishScheduledThreadWorker.perform_at([@thread.scheduled_at, Time.now.utc].max, @thread.id)
    render json: @thread, serializer: REST::ScheduledThreadSerializer
  end

  private

  def set_threads
    @threads = current_account.scheduled_threads.includes(scheduled_statuses: :media_attachments).to_a_paginated_by_id(
      limit_param(DEFAULT_STATUSES_LIMIT),
      params_slice(:max_id, :since_id, :min_id)
    )
  end

  def set_thread
    @thread = current_account.scheduled_threads.includes(scheduled_statuses: :media_attachments).find(params[:id])
  end

  def normalized_items
    permitted = params.permit(items: scheduled_item_params)
    Array(permitted[:items]).map { |item| normalized_scheduled_item(item) }
  end

  def next_path
    api_v1_scheduled_threads_url pagination_params(max_id: pagination_max_id) if records_continue?
  end

  def prev_path
    api_v1_scheduled_threads_url pagination_params(min_id: pagination_since_id) unless @threads.empty?
  end

  def records_continue?
    @threads.size == limit_param(DEFAULT_STATUSES_LIMIT)
  end

  def pagination_collection
    @threads
  end
end
