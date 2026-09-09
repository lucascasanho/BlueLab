# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AccountFilter do
  describe 'with empty params' do
    it 'excludes instance actor by default' do
      filter = described_class.new({})

      expect(filter.results).to eq Account.without_instance_actor
    end
  end

  describe 'with invalid params' do
    it 'raises with key error' do
      filter = described_class.new(wrong: true)

      expect { filter.results }.to raise_error(/wrong/)
    end
  end

  describe 'with origin and by_domain interacting' do
    let!(:local_account) { Fabricate(:account, domain: nil) }
    let!(:remote_account_one) { Fabricate(:account, domain: 'example.org') }
    let(:remote_account_two) { Fabricate(:account, domain: 'other.domain') }

    it 'works with domain first and origin remote' do
      filter = described_class.new(by_domain: 'example.org', origin: 'remote')
      expect(filter.results).to contain_exactly(remote_account_one)
    end

    it 'works with domain last and origin remote' do
      filter = described_class.new(origin: 'remote', by_domain: 'example.org')
      expect(filter.results).to contain_exactly(remote_account_one)
    end

    it 'works with domain first and origin local' do
      filter = described_class.new(by_domain: 'example.org', origin: 'local')
      expect(filter.results).to contain_exactly(local_account)
    end

    it 'works with domain last and origin local' do
      filter = described_class.new(origin: 'local', by_domain: 'example.org')
      expect(filter.results).to contain_exactly(remote_account_one)
    end
  end

  describe 'with username' do
    let!(:local_account) { Fabricate(:account, domain: nil, username: 'validUserName') }

    it 'works with @ at the beginning of the username' do
      filter = described_class.new(username: '@validUserName')
      expect(filter.results).to contain_exactly(local_account)
    end

    it 'does not work with more than one @ at the beginning of the username' do
      filter = described_class.new(username: '@@validUserName')
      expect(filter.results).to_not contain_exactly(local_account)
    end

    it 'does not work with @ outside the beginning of the username' do
      filter = described_class.new(username: 'validUserName@')
      expect(filter.results).to_not contain_exactly(local_account)
    end
  end

  describe 'with registration review status' do
    let!(:confirmed_pending_user) { Fabricate(:user).tap { |user| user.update!(approved: false, confirmed_at: 1.hour.ago) } }
    let!(:unconfirmed_pending_user) { Fabricate(:user).tap { |user| user.update!(approved: false, confirmed_at: nil) } }

    let(:confirmed_pending) { confirmed_pending_user.account }
    let(:unconfirmed_pending) { unconfirmed_pending_user.account }

    it 'lists only confirmed users as pending review' do
      expect(described_class.new(status: 'pending').results).to contain_exactly(confirmed_pending)
    end

    it 'lists unconfirmed users separately' do
      expect(described_class.new(status: 'unconfirmed').results).to contain_exactly(unconfirmed_pending)
    end
  end
end
