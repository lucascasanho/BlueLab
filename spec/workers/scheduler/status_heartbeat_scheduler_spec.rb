# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Scheduler::StatusHeartbeatScheduler do
  subject(:worker) { described_class.new }

  let(:request) { instance_double(Request, add_headers: nil, perform: nil) }

  before do
    allow(Request).to receive(:new).and_return(request)
    allow(request).to receive(:add_headers).and_return(request)
  end

  it 'sends an authenticated heartbeat to the status page for this instance' do
    ClimateControl.modify(
      LOCAL_DOMAIN: 'mastodon.example',
      SECRET_KEY_BASE: 'instance-secret',
      STATUS_HEARTBEAT_URL: nil
    ) do
      worker.perform
    end

    expected_token = OpenSSL::HMAC.hexdigest(
      'SHA256',
      'instance-secret',
      described_class::TOKEN_CONTEXT
    )
    expect(Request).to have_received(:new).with(
      :post,
      'https://status.mastodon.example/api/heartbeat/sidekiq',
      body: ''
    )
    expect(request).to have_received(:add_headers).with(
      hash_including('Authorization' => "Bearer #{expected_token}")
    )
    expect(request).to have_received(:perform)
  end

  it 'allows an explicit status heartbeat URL' do
    ClimateControl.modify(
      LOCAL_DOMAIN: 'mastodon.example',
      SECRET_KEY_BASE: 'instance-secret',
      STATUS_HEARTBEAT_URL: 'https://status.example.net/api/heartbeat/sidekiq'
    ) do
      worker.perform
    end

    expect(Request).to have_received(:new).with(
      :post,
      'https://status.example.net/api/heartbeat/sidekiq',
      body: ''
    )
  end
end
