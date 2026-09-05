# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UserRole do
  describe '#verified_by_instance?' do
    subject(:verified_by_instance) { role.verified_by_instance? }

    let(:role_name) { 'Role' }
    let(:permissions) { described_class::Flags::NONE }
    let(:role) { Fabricate(:user_role, name: role_name, permissions: permissions) }

    context 'when the role name is exactly Verificado' do
      let(:role_name) { 'Verificado' }

      it { is_expected.to be true }
    end

    context 'when the role name differs from Verificado by case' do
      let(:role_name) { 'verificado' }

      it { is_expected.to be false }
    end

    context 'when the role has the administrator privilege' do
      let(:role_name) { 'Owner' }
      let(:permissions) { described_class::FLAGS[:administrator] }

      it { is_expected.to be true }
    end

    context 'when the role has a moderation privilege' do
      let(:role_name) { 'Community team' }
      let(:permissions) { described_class::FLAGS[:manage_reports] }

      it { is_expected.to be true }
    end

    context 'when the role has an administration privilege' do
      let(:role_name) { 'Configuration team' }
      let(:permissions) { described_class::FLAGS[:manage_settings] }

      it { is_expected.to be true }
    end

    context 'when the role name merely contains Verificado' do
      let(:role_name) { 'Usuário Verificado especial' }

      it { is_expected.to be false }
    end

    context 'when the role is named Administrador but grants no privilege' do
      let(:role_name) { 'Administrador' }

      it { is_expected.to be false }
    end

    context 'when the role is named Moderador but grants no privilege' do
      let(:role_name) { 'Moderador' }

      it { is_expected.to be false }
    end

    context 'when the role only has a non-moderation privilege' do
      let(:permissions) { described_class::FLAGS[:invite_users] }

      it { is_expected.to be false }
    end

    context 'when the role is common and has no privileges' do
      let(:role_name) { 'Community member' }

      it { is_expected.to be false }
    end
  end

  describe 'verification timestamp synchronization after role definition changes' do
    let(:role) { Fabricate(:user_role, name: 'Community member') }
    let(:user) { Fabricate(:user, role: role) }
    let(:account) { user.account }

    before do
      account.update_column(:verified_by_role_since, nil)
    end

    it 'records the time when an assigned role becomes eligible' do
      expect { role.update!(name: 'Verificado') }
        .to change { account.reload.verified_by_role_since }
        .from(nil)
        .to(be_present)
    end

    it 'clears the time when an assigned role stops being eligible' do
      role.update!(name: 'Verificado')
      expect(account.reload.verified_by_role_since).to be_present

      expect { role.update!(name: 'Community member') }
        .to change { account.reload.verified_by_role_since }
        .to(nil)
    end

    it 'preserves the time when changing between eligible role conditions' do
      role.update!(name: 'Verificado')
      recorded_at = account.reload.verified_by_role_since

      role.update!(name: 'Community team', permissions: described_class::FLAGS[:manage_reports])

      expect(account.reload.verified_by_role_since).to eq(recorded_at)
    end

    it 'records the time when an assigned role gains moderation privileges' do
      expect { role.update!(permissions: described_class::FLAGS[:manage_reports]) }
        .to change { account.reload.verified_by_role_since }
        .from(nil)
        .to(be_present)
    end
  end
end
