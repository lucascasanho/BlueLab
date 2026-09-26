# frozen_string_literal: true

module Api
  module V1
    module Profile
      class VerificationBadgesController < Api::BaseController
        before_action -> { doorkeeper_authorize! :write, :'write:accounts' }
        before_action :require_user!

        def update
          return head :forbidden unless current_account.user_role&.verified_by_instance?

          visible = ActiveModel::Type::Boolean.new.cast(params.permit(:visible)[:visible])
          current_account.update!(verified_badge_visible: visible)

          render json: {
            verified_badge_visible: current_account.verified_badge_visible,
          }
        rescue ActiveRecord::RecordInvalid => e
          render json: ValidationErrorFormatter.new(e).as_json, status: :unprocessable_entity
        end
      end
    end
  end
end
