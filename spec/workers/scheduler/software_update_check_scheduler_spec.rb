# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Scheduler::SoftwareUpdateCheckScheduler do
  subject { described_class.new }

  describe 'perform' do
    let(:service_double) { instance_double(SoftwareUpdateCheckService, call: nil) }

    before do
      allow(SoftwareUpdateCheckService).to receive(:new).and_return(service_double)
    end

    it 'calls the standard Mastodon software update checker' do
      subject.perform
      expect(service_double).to have_received(:call)
    end
  end
end
