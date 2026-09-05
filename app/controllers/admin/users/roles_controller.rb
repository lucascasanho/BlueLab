# frozen_string_literal: true

module Admin
  class Users::RolesController < BaseController
    before_action :set_user

    def show
      authorize @user, :change_role?
    end

    def update
      authorize @user, :change_role?

      @user.current_account = current_account
      previously_verified = @user.role.verified_by_instance?

      if @user.update(resource_params)
        @user.association(:role).reset
        sync_verification_timestamp(previously_verified)
        log_action :change_role, @user
        redirect_to admin_account_path(@user.account_id), notice: I18n.t('admin.accounts.change_role.changed_msg')
      else
        render :show
      end
    end

    private

    def set_user
      @user = User.find(params[:user_id])
    end

    def sync_verification_timestamp(previously_verified)
      currently_verified = @user.role.verified_by_instance?
      return if previously_verified == currently_verified

      now = Time.current
      @user.account.update_columns(
        verified_by_role_since: currently_verified ? now : nil,
        updated_at: now
      )
    end

    def resource_params
      params
        .expect(user: [:role_id])
    end
  end
end
