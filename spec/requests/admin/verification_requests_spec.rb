# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin Verification Requests' do
  let(:admin) { Fabricate(:admin_user) }
  let(:account) { Fabricate(:account) }
  let(:verification_request) { VerificationRequest.create!(account: account, explanation: 'Please review my account.') }

  before { sign_in admin }

  describe 'badge visibility' do
    it 'keeps the badge visible by default' do
      expect(account.reload.verified_badge_visible).to be(true)
    end
  end

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
      Fabricate(:user_role, name: 'Verified')

      I18n.with_locale(:en) do
        post approve_admin_verification_request_path(verification_request)
      end

      expect(response).to have_http_status(:found)
      expect(response).to redirect_to(admin_verification_requests_path(status: 'pending'))
      expect(verification_request.reload.status).to eq('approved')
      expect(account.user.reload.role.name).to eq('Verified')
      expect(account.reload.verified_by_role_since).to be_present
    end
  end

  describe 'POST deny' do
    it 'resolves the request without changing the role' do
      original_role = account.user.role

      post deny_admin_verification_request_path(verification_request)

      expect(response).to have_http_status(:see_other)
      expect(response).to redirect_to(admin_verification_requests_path(status: 'pending'))
      expect(verification_request.reload.status).to eq('denied')
      expect(account.user.reload.role).to eq(original_role)
    end
  end
end
