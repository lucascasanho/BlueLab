# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin Users Roles' do
  context 'when target user is higher ranked than current user' do
    let(:current_role) { UserRole.create(name: 'Foo', permissions: UserRole::FLAGS[:manage_roles], position: 10) }
    let(:current_user) { Fabricate(:user, role: current_role) }

    let(:previous_role) { UserRole.create(name: 'Baz', permissions: UserRole::FLAGS[:administrator], position: 100) }
    let(:user) { Fabricate(:user, role: previous_role) }

    before { sign_in(current_user) }

    describe 'GET /admin/users/:user_id/role' do
      it 'returns http forbidden' do
        get admin_user_role_path(user.id)

        expect(response)
          .to have_http_status(403)
      end
    end

    describe 'PUT /admin/users/:user_id/role' do
      it 'returns http forbidden' do
        put admin_user_role_path(user.id)

        expect(response)
          .to have_http_status(403)
      end
    end
  end

  describe 'PUT /admin/users/:user_id/role' do
    before { sign_in Fabricate(:admin_user) }

    let(:user) { Fabricate :user }

    it 'gracefully handles invalid nested params' do
      put admin_user_role_path(user.id, user: 'invalid')

      expect(response)
        .to have_http_status(400)
    end

    it 'records when an eligible role is assigned' do
      verified_role = Fabricate(:user_role, name: 'Verificado')

      expect do
        put admin_user_role_path(user.id), params: { user: { role_id: verified_role.id } }
      end.to change { user.account.reload.verified_by_role_since }.from(nil).to(be_present)
    end

    it 'clears the date when an eligible role is removed' do
      verified_role = Fabricate(:user_role, name: 'Verificado')
      common_role = Fabricate(:user_role, name: 'Community member')
      user.update!(role: verified_role)
      user.account.update!(verified_by_role_since: 1.day.ago)

      expect do
        put admin_user_role_path(user.id), params: { user: { role_id: common_role.id } }
      end.to change { user.account.reload.verified_by_role_since }.to(nil)
    end
  end
end
