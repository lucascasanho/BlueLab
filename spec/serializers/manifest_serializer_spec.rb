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
    it 'includes separate general and maskable icons' do
      icons = serializer.icons

      expect(icons.pluck(:sizes)).to include('192x192', '512x512')
      expect(icons).to include(include(sizes: '192x192', purpose: 'any'))
      expect(icons).to include(include(sizes: '192x192', purpose: 'maskable'))
      expect(icons).to include(include(sizes: '512x512', purpose: 'any'))
      expect(icons).to include(include(sizes: '512x512', purpose: 'maskable'))
      expect(icons).not_to include(include(purpose: 'any maskable'))
    end
  end

  describe 'rich installation metadata' do
    it 'includes a description and screenshots for mobile and desktop' do
      expect(serializer.description).to be_present
      expect(serializer.screenshots).to contain_exactly(
        include(sizes: '471x939', type: 'image/png', form_factor: 'narrow'),
        include(sizes: '1890x940', type: 'image/png', form_factor: 'wide')
      )
    end

    it 'uses the Espelunca screenshots on its domain' do
      instance = instance_double(InstancePresenter, domain: 'espelunca.social', title: 'espelunca', description: 'Entre, sente e fale bobagem.')

      screenshots = described_class.new(instance).screenshots

      expect(screenshots.pluck(:src)).to all(include('espelunca-social'))
    end
  end

  describe 'install navigation metadata' do
    it 'opens as a standalone app and supports Window Controls Overlay' do
      expect(serializer.display).to eq('standalone')
      expect(serializer.display_override).to eq(['standalone', 'window-controls-overlay'])
      expect(serializer.start_url).to eq('/')
      expect(serializer.scope).to eq('/')
      expect(serializer.protocol_handlers).to include(
        protocol: 'web+mastodon',
        url: '/intent?uri=%s',
      )
    end

    it 'provides 96x96 icons for all shortcuts' do
      expect(serializer.shortcuts).to all(
        include(icons: contain_exactly(include(sizes: '96x96', type: 'image/png', purpose: 'any')))
      )
    end
  end
end
