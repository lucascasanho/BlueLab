# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ManifestSerializer do
  subject(:serializer) { described_class.new(InstancePresenter.new) }

  describe '#prefer_related_applications' do
    it 'keeps the web app eligible for Chromium installation promotion' do
      expect(serializer.prefer_related_applications).to be false
    end
  end

  describe '#icons' do
    it 'includes the icon sizes required by Chromium install promotion' do
      sizes = serializer.icons.pluck(:sizes)

      expect(sizes).to include('192x192', '512x512')
    end
  end

  describe 'rich installation metadata' do
    it 'includes a description and screenshots for mobile and desktop' do
      expect(serializer.description).to be_present
      expect(serializer.screenshots).to contain_exactly(
        include(sizes: '720x1280', type: 'image/png', form_factor: 'narrow'),
        include(sizes: '1280x720', type: 'image/png', form_factor: 'wide')
      )
    end

    it 'uses the Espelunca screenshots on its domain' do
      instance = instance_double(InstancePresenter, domain: 'espelunca.social', title: 'espelunca', description: 'Entre, sente e fale bobagem.')

      screenshots = described_class.new(instance).screenshots

      expect(screenshots.pluck(:src)).to all(include('espelunca-social'))
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
