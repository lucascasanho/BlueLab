# frozen_string_literal: true

module Api
  module V1
    module Profile
      class VerificationRequestsController < Api::BaseController
        before_action -> { doorkeeper_authorize! :read, :'read:accounts' }, only: [:show]
        before_action -> { doorkeeper_authorize! :write, :'write:accounts' }, only: [:create]
        before_action :require_user!

        def show
          status, next_request_at = VerificationRequest.eligibility_for(current_account)

          render json: {
            can_request: status == :available,
            reason: status,
            next_request_at: next_request_at&.iso8601,
          }
        end

        def create
          unless VerificationRequest.requestable?(current_account)
            render json: { error: 'Verification request is not available' }, status: :conflict
            return
          end

          verification_request = current_account.verification_requests.create!(
            explanation: verification_request_params[:text]
          )

          render json: {
            id: verification_request.id.to_s,
            created_at: verification_request.created_at.iso8601,
          }, status: :created
        rescue ActiveRecord::RecordNotUnique
          render json: { error: 'A verification request is already pending' }, status: :conflict
        rescue ActiveRecord::RecordInvalid => e
          render json: ValidationErrorFormatter.new(e).as_json, status: :unprocessable_entity
        end

        private

        def verification_request_params
          params.permit(:text)
        end
      end
    end
  end
end
