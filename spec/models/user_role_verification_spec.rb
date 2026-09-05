# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UserRole do
  describe '#verified_by_instance?' do
    subject(:verified_by_instance) { role.verified_by_instance? }

    let(:role_name) { 'Role' }
    let(:permissions) { described_class::Flags::NONE }
    let(:role) { Fabricate(:user_role, name: role_name, permissions: permissions) }

    %w(verified Verificado vf).each do |verified_name|
      context "when the role name is #{verified_name}" do
        let(:role_name) { verified_name }

        it { is_expected.to be true }
      end
    end

    context 'when the role name is Trusted verified' do
      let(:role_name) { 'Trusted verified' }

      it { is_expected.to be true }
    end

    context 'when a verified role name uses different case and surrounding whitespace' do
      let(:role_name) { '  VERIFIED  ' }

      it { is_expected.to be true }
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

    context 'when the role name merely contains a verified alias' do
      let(:role_name) { 'Usuário Verificado especial' }

      it { is_expected.to be false }
    end

    context 'when the role name suggests administration but grants no privilege' do
      let(:role_name) { 'Ex-administrador' }

      it { is_expected.to be false }
    end

    context 'when the role only has a non-moderation privilege' do
      let(:permissions) { described_class::FLAGS[:invite_users] }

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
      expect { role.update!(name: 'verified') }
        .to change { account.reload.verified_by_role_since }
        .from(nil)
        .to(be_present)
    end

    it 'clears the time when an assigned role stops being eligible' do
      role.update!(name: 'verified')
      expect(account.reload.verified_by_role_since).to be_present

      expect { role.update!(name: 'Community member') }
        .to change { account.reload.verified_by_role_since }
        .to(nil)
    end

    it 'preserves the time when changing between eligible role names' do
      role.update!(name: 'verified')
      recorded_at = account.reload.verified_by_role_since

      role.update!(name: 'Verificado')

      expect(account.reload.verified_by_role_since).to eq(recorded_at)
    end
  end
end
