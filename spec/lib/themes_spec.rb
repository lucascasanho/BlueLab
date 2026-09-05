# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Themes do
  describe '#names' do
    it 'keeps BlueLab, Bird UI and Vanilla available as separate themes' do
      expect(described_class.instance.names).to include('blue-2', 'mastodon-bird-ui-auto', 'default')
    end
  end

  describe 'theme labels' do
    it 'uses the BlueLab name for the Bluesky-inspired theme' do
      expect(I18n.t('themes.blue-2', locale: :en)).to eq('BlueLab')
      expect(I18n.t('themes.blue-2', locale: :'pt-BR')).to eq('BlueLab')
    end

    it 'keeps Bird UI identified separately' do
      expect(I18n.t('themes.mastodon-bird-ui-auto', locale: :en)).to eq('Bird UI')
      expect(I18n.t('themes.mastodon-bird-ui-auto', locale: :'pt-BR')).to eq('Bird UI')
    end
  end

  describe 'BlueLab stylesheet' do
    it 'keeps the latest BlueLab 2.0 entrypoint in the repository' do
      expect(Rails.root / 'app/javascript/styles/blue-2-v7.scss').to exist
    end
  end
end
