# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UserRole do
  describe '#instance_verification_eligible?' do
    %w[verified verificado vf].each do |role_name|
      it "accepts the #{role_name.inspect} role name" do
        role = Fabricate.build(:user_role, name: role_name, permissions: described_class::Flags::NONE)

        expect(role).to be_instance_verification_eligible
      end
    end

    it 'accepts Trusted verified case-insensitively with surrounding whitespace' do
      role = Fabricate.build(:user_role, name: '  TRUSTED VERIFIED  ', permissions: described_class::Flags::NONE)

      expect(role).to be_instance_verification_eligible
    end

    it 'accepts the administrator privilege' do
      role = Fabricate.build(:user_role, name: 'Owner', permissions: described_class::FLAGS[:administrator])

      expect(role).to be_instance_verification_eligible
    end

    it 'accepts privileges from the moderation category' do
      role = Fabricate.build(:user_role, name: 'Safety', permissions: described_class::FLAGS[:manage_reports])

      expect(role).to be_instance_verification_eligible
    end

    it 'accepts privileges from the administration category' do
      role = Fabricate.build(:user_role, name: 'Settings', permissions: described_class::FLAGS[:manage_settings])

      expect(role).to be_instance_verification_eligible
    end

    it 'rejects names that merely contain a verification alias' do
      role = Fabricate.build(:user_role, name: 'Usuário Verificado', permissions: described_class::Flags::NONE)

      expect(role).to_not be_instance_verification_eligible
    end

    it 'rejects administrative-looking names without privileges' do
      role = Fabricate.build(:user_role, name: 'Ex-administrador', permissions: described_class::Flags::NONE)

      expect(role).to_not be_instance_verification_eligible
    end

    it 'rejects roles with only invitation privileges' do
      role = Fabricate.build(:user_role, name: 'Convites', permissions: described_class::FLAGS[:invite_users])

      expect(role).to_not be_instance_verification_eligible
    end

    it 'rejects roles with only devops privileges' do
      role = Fabricate.build(:user_role, name: 'DevOps', permissions: described_class::FLAGS[:view_devops])

      expect(role).to_not be_instance_verification_eligible
    end
  end

  describe 'verification timestamp synchronization after editing a role' do
    let(:role) { Fabricate(:user_role, name: 'Membro', permissions: described_class::Flags::NONE) }
    let!(:user) { Fabricate(:user, role: role) }
    let(:verification_time) { Time.zone.parse('2026-09-05 15:30:00') }

    it 'sets the timestamp when an assigned role becomes verification eligible' do
      travel_to(verification_time) do
        role.update!(name: 'verified')
      end

      expect(user.reload.instance_verified_at).to be_within(1.second).of(verification_time)
    end

    it 'clears the timestamp when an assigned role stops being verification eligible' do
      role.update!(name: 'verified')
      user.reload
      expect(user.instance_verified_at).to be_present

      role.update!(name: 'Membro')

      expect(user.reload.instance_verified_at).to be_nil
    end

    it 'preserves the timestamp while an assigned role remains verification eligible' do
      role.update!(name: 'verified')
      original_timestamp = user.reload.instance_verified_at

      travel_to(verification_time + 1.day) do
        role.update!(name: 'vf')
      end

      expect(user.reload.instance_verified_at).to eq(original_timestamp)
    end
  end
end
