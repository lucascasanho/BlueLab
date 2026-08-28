# frozen_string_literal: true

require 'rails_helper'

RSpec.describe EntityCache do
  let(:local_account)  { Fabricate(:account, domain: nil, username: 'alice') }
  let(:remote_account) { Fabricate(:account, domain: 'remote.test', username: 'bob', url: 'https://remote.test/') }

  describe '#mention' do
    it 'resolves a former local username to its current account' do
      local_account.username_reservations.current.update!(relinquished_at: Time.now.utc)
      local_account.update_column(:username, 'alice_new')
      local_account.username_reservations.create!(username: 'alice_new')

      expect(described_class.instance.mention('alice', Rails.configuration.x.local_domain)).to eq(local_account)
    end

    it 'keeps resolving remote accounts normally' do
      expect(described_class.instance.mention(remote_account.username, remote_account.domain)).to eq(remote_account)
    end
  end

  describe '#emoji' do
    subject { described_class.instance.emoji(shortcodes, domain) }

    context 'when called with an empty list of shortcodes' do
      let(:shortcodes) { [] }
      let(:domain)     { 'example.org' }

      it 'returns an empty array' do
        expect(subject).to eq []
      end
    end
  end
end
