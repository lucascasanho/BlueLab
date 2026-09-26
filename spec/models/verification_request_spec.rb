# frozen_string_literal: true

require 'rails_helper'

RSpec.describe VerificationRequest do
  describe '.eligibility_for' do
    let(:account) { Fabricate(:account) }

    it 'allows a local functional account with no previous request' do
      expect(described_class.eligibility_for(account)).to eq([:available, nil])
    end

    it 'blocks a pending request' do
      described_class.create!(account: account, explanation: '')

      expect(described_class.eligibility_for(account).first).to eq(:pending)
    end

    it 'blocks a silenced account' do
      account.silence!

      expect(described_class.eligibility_for(account).first).to eq(:restricted)
    end

    it 'blocks a verified account' do
      verified_role = Fabricate(:user_role, name: UserRole::VERIFIED_ROLE_NAME)
      account.user.update!(role: verified_role)

      expect(described_class.eligibility_for(account).first).to eq(:verified)
    end

    it 'enforces the 30 day cooldown after a resolved request' do
      request = described_class.create!(account: account, explanation: '')
      request.update!(status: :denied, resolved_at: Time.current)

      status, next_request_at = described_class.eligibility_for(account)

      expect(status).to eq(:cooldown)
      expect(next_request_at).to be > Time.current
    end

    it 'notifies users who can manage roles' do
      moderator = Fabricate(:user, role: Fabricate(:user_role, permissions: UserRole::FLAGS[:manage_roles]))
      request = described_class.create!(account: account, explanation: '')

      expect(LocalNotificationWorker).to have_enqueued_sidekiq_job(
        moderator.account_id,
        request.id,
        'VerificationRequest',
        'admin.verification_request'
      )
    end
  end

  describe '#resolve!' do
    let(:request) { Fabricate.build(:account).verification_requests.create!(explanation: '') }
    let(:resolver) { Fabricate(:account) }

    it 'approves a pending request' do
      request.resolve!(resolver, status: :approved)

      expect(request.reload).to have_attributes(
        status: 'approved',
        resolved_by_account: resolver
      )
      expect(request.resolved_at).to be_present
    end

    it 'denies a pending request' do
      request.resolve!(resolver, status: :denied)

      expect(request.reload.status).to eq('denied')
    end
  end
end
