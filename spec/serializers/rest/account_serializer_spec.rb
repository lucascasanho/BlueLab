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
    context 'when the account role is Verificado but is not highlighted' do
      let(:role) { Fabricate(:user_role, name: 'Verificado', highlighted: false) }

      before do
        account.update!(verified_by_role_since: default_datetime)
      end

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end

      it 'exposes the persisted verification date' do
        expect(subject).to include(
          'verified_by_role_since' => match_api_datetime_format
        )
      end
    end

    %w(verified verificado vf).each do |verified_name|
      context "when the account role is #{verified_name}" do
        let(:role) { Fabricate(:user_role, name: verified_name, highlighted: false) }

        it 'marks the account as verified' do
          expect(subject['verified_by_role']).to be true
        end
      end
    end

    context 'when the account role is Trusted verified' do
      let(:role) { Fabricate(:user_role, name: 'Trusted verified', highlighted: false) }

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when a verified alias differs by case and surrounding whitespace' do
      let(:role) { Fabricate(:user_role, name: '  VERIFIED  ', highlighted: false) }

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when the account role has administrator privileges' do
      let(:role) do
        Fabricate(
          :user_role,
          name: 'Owner',
          permissions: UserRole::FLAGS[:administrator],
          highlighted: false
        )
      end

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when the account role has a moderation privilege' do
      let(:role) do
        Fabricate(
          :user_role,
          name: 'Community team',
          permissions: UserRole::FLAGS[:manage_reports],
          highlighted: false
        )
      end

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when the account role has an administration privilege' do
      let(:role) do
        Fabricate(
          :user_role,
          name: 'Configuration team',
          permissions: UserRole::FLAGS[:manage_settings],
          highlighted: false
        )
      end

      it 'marks the account as verified' do
        expect(subject['verified_by_role']).to be true
      end
    end

    context 'when the account role only contains a verified alias as part of its name' do
      let(:role) { Fabricate(:user_role, name: 'Usuário Verificado especial', highlighted: true) }

      it 'does not mark the account as verified' do
        expect(subject['verified_by_role']).to be false
      end
    end

    context 'when the account role name suggests administration but grants no privilege' do
      let(:role) { Fabricate(:user_role, name: 'Ex-administrador', highlighted: true) }

      it 'does not mark the account as verified' do
        expect(subject['verified_by_role']).to be false
      end
    end

    context 'when the account role only has a non-moderation privilege' do
      let(:role) do
        Fabricate(
          :user_role,
          name: 'Inviter',
          permissions: UserRole::FLAGS[:invite_users],
          highlighted: false
        )
      end

      it 'does not mark the account as verified' do
        expect(subject['verified_by_role']).to be false
      end
    end

    context 'when the account role is not eligible' do
      let(:role) { Fabricate(:user_role, name: 'Moderador', highlighted: true) }

      before do
        account.update!(verified_by_role_since: default_datetime)
      end

      it 'does not mark the account as verified' do
        expect(subject['verified_by_role']).to be false
      end

      it 'does not expose a stale verification date' do
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
