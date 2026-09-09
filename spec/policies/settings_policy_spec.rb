# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SettingsPolicy do
  subject { described_class }

  let(:admin) { Fabricate(:admin_user).account }
  let(:settings_manager) do
    role = Fabricate(:user_role, permissions: UserRole::FLAGS[:manage_settings])
    Fabricate(:user, role:).account
  end
  let(:john) { Fabricate(:account) }

  permissions :update?, :show?, :destroy? do
    context 'when admin?' do
      it 'permits' do
        expect(subject).to permit(admin, Settings)
      end
    end

    context 'with the granular manage settings permission' do
      it 'permits' do
        expect(subject).to permit(settings_manager, Settings)
      end
    end

    context 'with !admin?' do
      it 'denies' do
        expect(subject).to_not permit(john, Settings)
      end
    end
  end
end
