# frozen_string_literal: true

module Admin
  class CustomEmojisController < BaseController
    def index
      authorize :custom_emoji, :index?

      # If filtering by domain, ensure remote filter is set.
      if params[:by_domain].present?
        params.delete(:local)
        params[:remote] = '1'
      end

      @custom_emojis = filtered_custom_emojis.eager_load(:local_counterpart).page(params[:page])
      @form          = Form::CustomEmojiBatch.new
    end

    def new
      authorize :custom_emoji, :create?

      @custom_emoji = CustomEmoji.new
    end

    def create
      authorize :custom_emoji, :create?

      @custom_emoji = CustomEmoji.new(resource_params)

      if @custom_emoji.save
        log_action :create, @custom_emoji
        redirect_to admin_custom_emojis_path, notice: I18n.t('admin.custom_emojis.created_msg')
      else
        render :new
      end
    end

    def edit
      @custom_emoji = local_custom_emoji
      return if performed?
    end

    def update
      @custom_emoji = local_custom_emoji
      return if performed?

      if @custom_emoji.update(shortcode_params)
        log_action :update, @custom_emoji
        redirect_to admin_custom_emojis_path(local: '1'), notice: I18n.t('admin.custom_emojis.updated_msg')
      else
        render :edit
      end
    end

    def batch
      authorize :custom_emoji, :index?

      @form = Form::CustomEmojiBatch.new(form_custom_emoji_batch_params.merge(current_account: current_account, action: action_from_button))
      @form.save
    rescue ActionController::ParameterMissing
      flash[:alert] = I18n.t('admin.custom_emojis.no_emoji_selected')
    rescue Mastodon::NotPermittedError
      flash[:alert] = I18n.t('admin.custom_emojis.not_permitted')
    ensure
      redirect_to admin_custom_emojis_path(filter_params)
    end

    private

    def local_custom_emoji
      custom_emoji = CustomEmoji.find(params[:id])

      authorize custom_emoji, :update?

      return custom_emoji if custom_emoji.local?

      redirect_to admin_custom_emojis_path, alert: I18n.t('admin.custom_emojis.not_permitted')
    end

    def shortcode_params
      params.expect(custom_emoji: [:shortcode])
    end

    def resource_params
      params
        .expect(custom_emoji: [:shortcode, :image, :visible_in_picker])
    end

    def filtered_custom_emojis
      CustomEmojiFilter.new(filter_params).results
    end

    def filter_params
      params.slice(:page, *CustomEmojiFilter::KEYS).permit(:page, *CustomEmojiFilter::KEYS)
    end

    def action_from_button
      if params[:update]
        'update'
      elsif params[:list]
        'list'
      elsif params[:unlist]
        'unlist'
      elsif params[:enable]
        'enable'
      elsif params[:disable]
        'disable'
      elsif params[:copy]
        'copy'
      elsif params[:delete]
        'delete'
      end
    end

    def form_custom_emoji_batch_params
      params
        .expect(form_custom_emoji_batch: [:action, :category_id, :category_name, custom_emoji_ids: []])
    end
  end
end
