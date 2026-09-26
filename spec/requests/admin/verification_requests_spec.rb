# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin Verification Requests' do
  let(:admin) { Fabricate(:admin_user) }
  let(:account) { Fabricate(:account) }
  let(:verification_request) { VerificationRequest.create!(account: account, explanation: 'Please review my account.') }

  before { sign_in admin }

  describe 'GET /admin/verification_requests' do
    it 'shows pending requests by default' do
      get admin_verification_requests_path

      expect(response).to have_http_status(200)
      expect(response.body).to include('Please review my account.')
    end
  end

  describe 'POST approve' do
    it 'grants the Verificado role and resolves the request' do
      Fabricate(:user_role, name: UserRole::VERIFIED_ROLE_NAME)

      post approve_admin_verification_request_path(verification_request)

      expect(response).to redirect_to(admin_verification_requests_path(status: 'pending'))
      expect(verification_request.reload.status).to eq('approved')
      expect(account.user.reload.role.name).to eq(UserRole::VERIFIED_ROLE_NAME)
      expect(account.reload.verified_by_role_since).to be_present
    end
  end

  describe 'POST deny' do
    it 'resolves the request without changing the role' do
      original_role = account.user.role

      post deny_admin_verification_request_path(verification_request)

      expect(response).to redirect_to(admin_verification_requests_path(status: 'pending'))
      expect(verification_request.reload.status).to eq('denied')
      expect(account.user.reload.role).to eq(original_role)
    end
  end
end
