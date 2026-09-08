# frozen_string_literal: true

require 'rails_helper'

RSpec.describe FetchRemoteInstanceVerificationService do
  subject(:fetch_verification) { described_class.new.call(account) }

  let(:account) do
    Fabricate(
      :account,
      username: 'alice',
      domain: 'remote.example',
      uri: 'https://remote.example/users/alice'
    )
  end

  before do
    stub_request(:get, 'https://remote.example/api/v2/instance')
      .to_return(
        body: {
          title: 'Remote community',
          version: '4.8.0+BlueLab',
          source_url: 'https://github.com/lucascasanho/BlueLab',
        }.to_json,
        headers: { 'Content-Type': 'application/json' }
      )
  end

  it 'imports verification exposed by an older BlueLab REST API' do
    stub_lookup(
      verified_by_role: true,
      verified_by_role_since: '2026-09-05T12:00:00.000Z'
    )

    fetch_verification

    expect(account.reload.remote_instance_verification).to eq(
      'source' => 'rest',
      'issuer' => 'Remote community',
      'verified_at' => '2026-09-05T12:00:00.000Z'
    )
  end

  it 'clears stale verification when the source reports that it was removed' do
    account.update!(remote_instance_verification: { 'source' => 'rest', 'issuer' => 'Remote community' })
    stub_lookup(verified_by_role: false, verified_by_role_since: nil)

    expect { fetch_verification }
      .to change { account.reload.remote_instance_verification }
      .to({})
  end

  it 'rejects a lookup response for a different actor' do
    account.update!(remote_instance_verification: { 'source' => 'rest', 'issuer' => 'Remote community' })
    stub_lookup(verified_by_role: true, uri: 'https://remote.example/users/mallory')

    expect { fetch_verification }
      .to_not(change { account.reload.remote_instance_verification })
  end

  it 'does not overwrite fresher ActivityPub metadata' do
    account.update!(remote_instance_verification: { 'source' => 'activitypub', 'issuer' => 'Remote community' })

    fetch_verification

    expect(a_request(:get, %r{/api/})).to_not have_been_made
  end

  def stub_lookup(verified_by_role:, verified_by_role_since: nil, uri: account.uri)
    stub_request(:get, 'https://remote.example/api/v1/accounts/lookup?acct=alice')
      .to_return(
        body: {
          username: account.username,
          uri: uri,
          verified_by_role: verified_by_role,
          verified_by_role_since: verified_by_role_since,
        }.to_json,
        headers: { 'Content-Type': 'application/json' }
      )
  end
end
