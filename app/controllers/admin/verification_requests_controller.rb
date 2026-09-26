# frozen_string_literal: true

module Admin
  class VerificationRequestsController < BaseController
    before_action :set_verification_request, except: [:index]

    def index
      authorize :verification_request, :index?
      @status = params[:status].presence_in(%w(pending all resolved)) || 'pending'
      @verification_requests = filtered_verification_requests.page(params[:page])
    end

    def show
      authorize @verification_request, :show?
    end

    def approve
      authorize @verification_request, :resolve?

      verified_role = UserRole.find_by(name: UserRole::VERIFIED_ROLE_NAME)
      unless verified_role
        return redirect_to admin_verification_request_path(@verification_request),
                           alert: I18n.t('admin.verification_requests.verified_role_missing'),
                           status: :see_other
      end

      unless current_user.user_role.overrides?(verified_role)
        return redirect_to admin_verification_request_path(@verification_request),
                           alert: I18n.t('admin.verification_requests.role_not_assignable'),
                           status: :see_other
      end

      user = @verification_request.account.user
      if user.nil?
        return redirect_to admin_verification_request_path(@verification_request),
                           alert: I18n.t('admin.verification_requests.account_unavailable'),
                           status: :see_other
      end

      role_changed = false

      VerificationRequest.transaction do
        @verification_request.lock!
        raise ActiveRecord::RecordNotFound unless @verification_request.pending?

        user.with_lock do
          if user.role.verified_by_instance?
            @verification_request.resolve!(current_account, status: :approved)
          elsif user.role.position > verified_role.position
            user.errors.add(:role_id, :elevated)
            raise ActiveRecord::RecordInvalid.new(user)
          else
            user.current_account = current_account
            previously_verified = user.role.verified_by_instance?

            # Keep the same role-update path used by the native administration UI.
            user.update!(role_id: verified_role.id)
            user.association(:role).reset

            sync_verification_timestamp(user, previously_verified)
            @verification_request.resolve!(current_account, status: :approved)
            role_changed = true
          end
        end
      end

      log_action :change_role, user if role_changed
      redirect_to admin_verification_requests_path(status: 'pending'),
                  notice: I18n.t('admin.verification_requests.approved_msg'),
                  status: :see_other
    rescue ActiveRecord::RecordNotFound
      redirect_to admin_verification_request_path(@verification_request),
                  alert: I18n.t('admin.verification_requests.already_resolved'),
                  status: :see_other
    rescue ActiveRecord::RecordInvalid => e
      if e.record.errors.added?(:role_id, :elevated)
        redirect_to admin_verification_request_path(@verification_request),
                    alert: I18n.t('admin.verification_requests.role_would_be_downgraded'),
                    status: :see_other
      elsif e.record.errors.added?(:role, :elevated)
        redirect_to admin_verification_request_path(@verification_request),
                    alert: I18n.t('admin.verification_requests.role_would_be_downgraded'),
                    status: :see_other
      else
        redirect_to admin_verification_request_path(@verification_request),
                    alert: e.record.errors.full_messages.to_sentence,
                    status: :see_other
      end
    end

    def deny
      authorize @verification_request, :resolve?

      VerificationRequest.transaction do
        @verification_request.lock!
        raise ActiveRecord::RecordNotFound unless @verification_request.pending?

        @verification_request.resolve!(current_account, status: :denied)
      end

      redirect_to admin_verification_requests_path(status: 'pending'),
                  notice: I18n.t('admin.verification_requests.denied_msg'),
                  status: :see_other
    rescue ActiveRecord::RecordNotFound
      redirect_to admin_verification_request_path(@verification_request),
                  alert: I18n.t('admin.verification_requests.already_resolved'),
                  status: :see_other
    rescue ActiveRecord::RecordInvalid => e
      redirect_to admin_verification_request_path(@verification_request),
                  alert: e.record.errors.full_messages.to_sentence,
                  status: :see_other
    end

    private

    def filtered_verification_requests
      scope = VerificationRequest.recent.includes(:account, :resolved_by_account)

      case @status
      when 'pending'
        scope.pending
      when 'resolved'
        scope.resolved
      else
        scope
      end
    end

    def set_verification_request
      @verification_request = VerificationRequest.includes(:account, :resolved_by_account).find(params[:id])
    end

    def sync_verification_timestamp(user, previously_verified)
      currently_verified = user.role.verified_by_instance?
      return if previously_verified == currently_verified

      now = Time.current
      user.account.update_columns(
        verified_by_role_since: currently_verified ? now : nil,
        updated_at: now
      )
      ActivityPub::UpdateDistributionWorker.perform_in(
        ActivityPub::UpdateDistributionWorker::DEBOUNCE_DELAY,
        user.account_id
      )
    end
  end
end
