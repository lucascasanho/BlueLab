# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Profile verification request API' do
  include_context 'with API authentication'

  let(:account) { Fabricate(:account) }
  let(:user) { account.user }

  describe 'GET /api/v1/profile/verification_request' do
    let(:scopes) { 'read:accounts' }

    it 'reports that a request is available' do
      get '/api/v1/profile/verification_request', headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body).to include(
        'can_request' => true,
        'reason' => 'available',
        'next_request_at' => nil
      )
    end
  end

  describe 'POST /api/v1/profile/verification_request' do
    let(:scopes) { 'write:accounts' }

    it 'accepts an empty optional message' do
      expect {
        post '/api/v1/profile/verification_request', headers: headers, params: { text: '' }
      }.to change(described_class::VerificationRequest, :count).by(1)

      expect(response).to have_http_status(201)
    end

    it 'rejects messages longer than 5000 characters' do
      post '/api/v1/profile/verification_request', headers: headers, params: { text: 'a' * 5001 }

      expect(response).to have_http_status(422)
    end
  end

  describe 'PATCH /api/v1/profile/verification_badge' do
    let(:scopes) { 'write:accounts' }

    before do
      user.update!(role: Fabricate(:user_role, name: UserRole::VERIFIED_ROLE_NAME))
    end

    it 'updates badge visibility' do
      patch '/api/v1/profile/verification_badge', headers: headers, params: { visible: false }

      expect(response).to have_http_status(200)
      expect(response.parsed_body).to include('verified_badge_visible' => false)
      expect(account.reload.verified_badge_visible).to be(false)
    end
  end
end
