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

  context 'with a Threads actor' do
    let(:account) do
      Fabricate(
        :account,
        username: 'alice',
        domain: 'threads.net',
        uri: 'https://www.threads.net/ap/users/123456'
      )
    end

    around do |example|
      ClimateControl.modify(
        THREADS_VERIFICATION_LOOKUP_ENABLED: 'true',
        THREADS_PROFILE_DISCOVERY_ACCESS_TOKEN: nil
      ) { example.run }
    end

    before do
      Rails.cache.delete(['threads-profile-verification', account.username.downcase])
    end

    it 'imports a verified result from the matching public profile' do
      stub_threads_profile('alice', verified: true)

      fetch_verification

      expect(account.reload.remote_instance_verification).to eq(
        'source' => 'threads',
        'issuer' => 'Threads',
        'badge' => InstanceVerification.threads_badge
      )
    end

    it 'clears only stale verification previously sourced from Threads' do
      account.update!(remote_instance_verification: { 'source' => 'threads', 'issuer' => 'Threads' })
      stub_threads_profile('alice', verified: false)

      expect { fetch_verification }
        .to change { account.reload.remote_instance_verification }
        .to({})
    end

    it 'does not clear metadata from a different source on an unverified result' do
      original = { 'source' => 'rest', 'issuer' => 'Other source' }
      account.update!(remote_instance_verification: original)
      stub_threads_profile('alice', verified: false)

      expect { fetch_verification }
        .to_not(change { account.reload.remote_instance_verification })
    end

    it 'rejects verification belonging to another profile in the document' do
      stub_threads_profile('mallory', verified: true)

      expect { fetch_verification }
        .to_not(change { account.reload.remote_instance_verification })
    end

    it 'caches both verified and unverified results for the account' do
      request = stub_threads_profile('alice', verified: false)

      2.times { fetch_verification }

      expect(request).to have_been_requested.once
    end

    it 'uses the official Profile Discovery API when a token is configured' do
      api_request = stub_request(:get, 'https://graph.threads.net/v1.0/profile_lookup?username=alice')
        .with(headers: { 'Authorization' => 'Bearer test-token' })
        .to_return(
          status: 200,
          body: { username: 'alice', is_verified: true }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )

      ClimateControl.modify(THREADS_PROFILE_DISCOVERY_ACCESS_TOKEN: 'test-token') { fetch_verification }

      expect(api_request).to have_been_requested.once
      expect(a_request(:get, %r{threads\.com/@alice})).to_not have_been_made
      expect(account.reload.remote_instance_verification).to include('source' => 'threads')
    end

    it 'falls back to the public profile when the official API is unavailable' do
      stub_request(:get, 'https://graph.threads.net/v1.0/profile_lookup?username=alice')
        .to_return(status: 503)
      profile_request = stub_threads_profile('alice', verified: true)

      ClimateControl.modify(THREADS_PROFILE_DISCOVERY_ACCESS_TOKEN: 'test-token') { fetch_verification }

      expect(profile_request).to have_been_requested.once
      expect(account.reload.remote_instance_verification).to include('source' => 'threads')
    end

    it 'does not consult a Threads profile for an actor URI on another host' do
      account.update!(uri: 'https://not-threads.example/ap/users/123456')
      stub_request(:get, 'https://threads.net/api/v2/instance').to_return(status: 404)

      fetch_verification

      expect(a_request(:get, /(?:www\.threads\.com|graph\.threads\.net)/)).to_not have_been_made
    end

    it 'does nothing when the lookup feature is disabled' do
      ClimateControl.modify(THREADS_VERIFICATION_LOOKUP_ENABLED: 'false') { fetch_verification }

      expect(a_request(:get, /threads\.(?:com|net)/)).to_not have_been_made
    end
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

  def stub_threads_profile(username, verified:)
    stub_request(:get, 'https://www.threads.com/@alice')
      .to_return(
        status: 200,
        body: %({"profile":{"username":"#{username}","is_verified":#{verified}}}),
        headers: { 'Content-Type' => 'text/html' }
      )
  end
end
