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

    it 'uses the any purpose for the general app icons' do
      general_icons = serializer.icons.reject { |icon| icon[:purpose] == 'maskable' }

      expect(general_icons).to all(include(purpose: 'any'))
    end

    it 'keeps maskable icons separate from general icons' do
      maskable = serializer.icons.select { |icon| icon[:purpose] == 'maskable' }

      expect(maskable.pluck(:sizes)).to contain_exactly('192x192', '512x512')
      expect(serializer.icons).not_to include(include(purpose: 'any maskable'))
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

  describe '#shortcuts' do
    it 'provides a 96x96 icon with general purpose for every shortcut' do
      expect(serializer.shortcuts).to all(include(icons: [include(sizes: '96x96', type: 'image/png', purpose: 'any')]))
    end
  end

  describe '#protocol_handlers' do
    it 'registers the Mastodon web protocol through the in-scope intent route' do
      expect(serializer.protocol_handlers).to eq([
        {
          protocol: 'web+mastodon',
          url: '/intent?uri=%s',
        },
      ])
    end
  end

  describe 'install navigation metadata' do
    it 'opens as a standalone app within the instance scope' do
      expect(serializer.display).to eq('standalone')
      expect(serializer.display_override).to contain_exactly('standalone', 'window-controls-overlay')
      expect(serializer.display_override.first).to eq('standalone')
      expect(serializer.start_url).to eq('/')
      expect(serializer.scope).to eq('/')
    end
  end
end
