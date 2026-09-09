# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Admin::SystemCheck::RegistrationAbuseCheck do
  include RoutingHelper

  subject(:check) { described_class.new(user) }

  let(:user) { Fabricate(:user) }

  describe '#skip?' do
    it 'skips the check without user-management permission' do
      allow(user).to receive(:can?).with(:manage_users).and_return(false)

      expect(check.skip?).to be true
    end

    it 'runs the check for user managers' do
      allow(user).to receive(:can?).with(:manage_users).and_return(true)

      expect(check.skip?).to be false
    end
  end

  describe '#pass?' do
    it 'passes below the unusual-volume threshold' do
      Fabricate.times(described_class::ALERT_THRESHOLD - 1, :user, confirmed_at: nil)

      expect(check.pass?).to be true
    end

    it 'fails at the unusual-volume threshold' do
      Fabricate.times(described_class::ALERT_THRESHOLD, :user, confirmed_at: nil)

      expect(check.pass?).to be false
    end

    it 'ignores old unconfirmed registrations' do
      Fabricate.times(described_class::ALERT_THRESHOLD, :user, confirmed_at: nil, created_at: 2.days.ago)

      expect(check.pass?).to be true
    end
  end

  describe '#message' do
    it 'links to the isolated unconfirmed-registration view' do
      Fabricate(:user, confirmed_at: nil)

      expect(check.message)
        .to have_attributes(
          key: :registration_abuse_check,
          value: 1,
          action: admin_accounts_path(status: 'unconfirmed')
        )
    end
  end
end
