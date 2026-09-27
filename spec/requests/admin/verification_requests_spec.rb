# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin Verification Requests' do
  describe 'POST /admin/verification_requests/:id/approve' do
    it 'allows approval when the moderator and verification role have equal positions' do
      moderator_role = UserRole.create!(
        name: 'Verification moderator',
        permissions: UserRole::FLAGS[:manage_roles],
        position: 0
      )
      verified_role = UserRole.create!(
        name: UserRole::VERIFIED_ROLE_NAME,
        permissions: UserRole::Flags::NONE,
        position: 0
      )
      current_user = Fabricate(:user, role: moderator_role)
      target_user = Fabricate(:user)
      verification_request = VerificationRequest.create!(
        account: target_user.account,
        explanation: ''
      )

      sign_in current_user

      expect do
        post approve_admin_verification_request_path(verification_request)
      end.to change { target_user.reload.role_id }.from(target_user.role_id).to(verified_role.id)

      expect(response)
        .to have_http_status(303)
      expect(verification_request.reload)
        .to be_approved
    end
  end
end
