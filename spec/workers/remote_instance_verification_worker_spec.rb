# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RemoteInstanceVerificationWorker do
  subject(:perform) { described_class.new.perform(account_id) }

  let(:service) { instance_double(FetchRemoteInstanceVerificationService, call: true) }

  before do
    allow(FetchRemoteInstanceVerificationService).to receive(:new).and_return(service)
  end

  context 'with a remote account' do
    let(:account) { Fabricate(:account, domain: 'remote.example') }
    let(:account_id) { account.id }

    it 'fetches verification metadata' do
      perform

      expect(service).to have_received(:call).with(account)
    end
  end

  context 'with a local account' do
    let(:account) { Fabricate(:account) }
    let(:account_id) { account.id }

    it 'does not call the service' do
      perform

      expect(service).to_not have_received(:call)
    end
  end
end
