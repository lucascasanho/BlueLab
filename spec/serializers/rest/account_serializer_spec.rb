# frozen_string_literal: true

require 'rails_helper'

RSpec.describe REST::AccountSerializer do
  subject do
    serialized_record_json(account, described_class, options: {
      scope: current_user,
      scope_name: :current_user,
    })
  end

  let(:default_datetime) { DateTime.new(2024, 11, 28, 16, 20, 0) }
  let(:role)    { Fabricate(:user_role, name: 'Role', highlighted: true) }
  let(:user)    { Fabricate(:user, role: role) }
  let(:account) { user.account }
  let(:current_user) { Fabricate(:user) }

  context 'when the account is suspended' do
    before do
      account.suspend!
    end

    it 'returns empty roles' do
      expect(subject['roles']).to eq []
    end
  end

  context 'when the account has a highlighted role' do
    let(:role) { Fabricate(:user_role, name: 'Role', highlighted: true) }

    it 'returns the expected role' do
      expect(subject['roles'].first).to include({ 'name' => 'Role' })
    end
  end

  context 'when the account has a non-highlighted role' do
    let(:role) { Fabricate(:user_role, name: 'Role', highlighted: false) }

    it 'returns empty roles' do
      expect(subject['roles']).to eq []
    end
  end

  describe '#verified_by_role' do
    context 'when the account role is a verification alias but is not highlighted' do
      let(:role) { Fabricate(:user_role, name: 'Verificado', highlighted: false) }

      before do
        user.update_column(:instance_verified_at, default_datetime)
      end

      it 'marks the account as verified independently of role highlighting' do
        expect(subject['verified_by_role']).to be true
      end

      it 'exposes the persisted verification date' do
        expect(subject).to include(
          'verified_by_role_since' => match_api_datetime_format
        )
        expect(Time.iso8601(subject['verified_by_role_since']).to_i).to eq(default_datetime.to_time.to_i)
      end
    end

    %w[verified verificado vf].each do |role_name|
      context "when the account role is #{role_name.inspect}" do
        let(:role) { Fabricate(:user_role, name: role_name, highlighted: true) }

        it 'marks the account as verified' do
          expect(subject['verified_by_role']).to be true
        end
      end
    end

    context 'when the account role is Trusted verified with different case and surrounding whitespace' do
      let(:role) { Fabricate(:user_role, name: '  TRUSTED VERIFIED  ', highlighted: true) }

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when the account role has the administrator privilege' do
      let(:role) { Fabricate(:user_role, name: 'Owner', permissions: UserRole::FLAGS[:administrator]) }

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when the account role has a moderation privilege' do
      let(:role) { Fabricate(:user_role, name: 'Safety', permissions: UserRole::FLAGS[:manage_reports]) }

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when the account role has an administration privilege' do
      let(:role) { Fabricate(:user_role, name: 'Settings', permissions: UserRole::FLAGS[:manage_settings]) }

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when the account role only contains a verification alias as part of its name' do
      let(:role) { Fabricate(:user_role, name: 'Usuário Verificado', highlighted: true) }

      it 'does not mark the account as verified' do
        expect(subject['verified_by_role']).to be false
      end
    end

    context 'when the account role looks administrative but has no administrative privileges' do
      let(:role) { Fabricate(:user_role, name: 'Ex-administrador', permissions: UserRole::Flags::NONE) }

      it 'does not mark the account as verified' do
        expect(subject['verified_by_role']).to be false
      end
    end

    context 'when the account role is named Moderador but has no moderation privileges' do
      let(:role) { Fabricate(:user_role, name: 'Moderador', permissions: UserRole::Flags::NONE) }

      it 'does not mark the account as verified' do
        expect(subject['verified_by_role']).to be false
      end
    end

    context 'when the account role only has invitation privileges' do
      let(:role) { Fabricate(:user_role, name: 'Convites', permissions: UserRole::FLAGS[:invite_users]) }

      it 'does not mark the account as verified' do
        expect(subject['verified_by_role']).to be false
      end
    end

    context 'when a verified account has no persisted verification date' do
      let(:role) { Fabricate(:user_role, name: 'verified') }

      before do
        user.update_column(:instance_verified_at, nil)
        Admin::ActionLog.create!(
          account: current_user.account,
          action: 'change_role',
          target: user,
          created_at: default_datetime,
          updated_at: default_datetime
        )
      end

      it 'does not query the audit log as a runtime fallback' do
        expect(subject['verified_by_role']).to be true
        expect(subject['verified_by_role_since']).to be_nil
      end
    end

    context 'when the account role is not eligible for verification' do
      let(:role) { Fabricate(:user_role, name: 'Membro', permissions: UserRole::Flags::NONE) }

      it 'does not expose verification metadata' do
        expect(subject['verified_by_role']).to be false
        expect(subject['verified_by_role_since']).to be_nil
      end
    end
  end

  context 'when the account is memorialized' do
    before do
      account.memorialize!
    end

    it 'marks it as such' do
      expect(subject['memorial']).to be true
    end
  end

  context 'when created_at is populated' do
    before do
      account.account_stat.update!(created_at: default_datetime)
    end

    it 'parses as RFC 3339 datetime' do
      expect(subject)
        .to include(
          'created_at' => match_api_datetime_format
        )
    end
  end

  context 'when last_status_at is populated' do
    before do
      account.account_stat.update!(last_status_at: default_datetime)
    end

    it 'is serialized as yyyy-mm-dd' do
      expect(subject['last_status_at']).to eq('2024-11-28')
    end
  end

  describe '#feature_approval' do
    context 'when account is local' do
      context 'when account is discoverable' do
        it 'includes a policy that allows featuring' do
          expect(subject['feature_approval']).to include({
            'automatic' => ['public'],
            'manual' => [],
            'current_user' => 'automatic',
          })
        end

        context 'when account is locked' do
          let(:account) { Fabricate(:account, locked: true) }

          context 'when the current account does not follow the user' do
            it 'includes a policy that allows featuring for followers and has "denied" for the current user' do
              expect(subject['feature_approval']).to include({
                'automatic' => ['followers'],
                'manual' => [],
                'current_user' => 'denied',
              })
            end
          end

          context 'when the current account follows the user' do
            before { current_user.account.follow!(account) }

            it 'includes a policy that allows featuring for followers and has "automatic" for the current user' do
              expect(subject['feature_approval']).to include({
                'automatic' => ['followers'],
                'manual' => [],
                'current_user' => 'automatic',
              })
            end
          end
        end
      end

      context 'when account is not discoverable' do
        let(:account) { Fabricate(:account, discoverable: false) }

        it 'includes a policy that disallows featuring' do
          expect(subject['feature_approval']).to include({
            'automatic' => [],
            'manual' => [],
            'current_user' => 'denied',
          })
        end
      end
    end

    context 'when account is remote' do
      let(:account) { Fabricate(:account, domain: 'example.com', feature_approval_policy: 0b11000000000000000010) }

      it 'includes the matching policy' do
        expect(subject['feature_approval']).to include({
          'automatic' => ['followers', 'following'],
          'manual' => ['public'],
          'current_user' => 'manual',
        })
      end
    end
  end
end
