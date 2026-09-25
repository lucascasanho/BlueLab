# frozen_string_literal: true

require 'rails_helper'

RSpec.describe BugReport do
  describe 'validations' do
    it 'rejects descriptions longer than the limit' do
      report = Fabricate.build(:bug_report, description: 'a' * (described_class::MAX_DESCRIPTION_LENGTH + 1))

      expect(report).to be_invalid
      expect(report.errors[:description]).to be_present
    end
  end

  describe '#resolve!' do
    let(:report) { Fabricate(:bug_report) }
    let(:moderator) { Fabricate(:account) }

    it 'marks the report as resolved and records the moderator' do
      report.resolve!(moderator)

      expect(report).to be_resolved
      expect(report.resolved_by_account).to eq moderator
      expect(report.resolved_at).to be_present
    end
  end

  describe '#reopen!' do
    let(:report) { Fabricate(:bug_report, status: :resolved, resolved_at: 1.hour.ago, resolved_by_account: Fabricate(:account)) }

    it 'returns the report to the open state' do
      report.reopen!

      expect(report).to be_open
      expect(report.resolved_by_account).to be_nil
      expect(report.resolved_at).to be_nil
    end
  end
end
