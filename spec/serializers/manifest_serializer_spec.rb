# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ManifestSerializer do
  subject(:serializer) { described_class.new(InstancePresenter.new) }

  describe '#prefer_related_applications' do
    it 'keeps the web app eligible for Chromium installation promotion' do
      expect(serializer.prefer_related_applications).to be false
    end
  end

  describe 'install navigation metadata' do
    it 'opens as a standalone app within the instance scope' do
      expect(serializer.display).to eq('standalone')
      expect(serializer.start_url).to eq('/')
      expect(serializer.scope).to eq('/')
    end
  end
end
