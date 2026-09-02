# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Themes do
  describe '#names' do
    it 'keeps the BlueLab theme available alongside Vanilla' do
      expect(described_class.instance.names).to include('mastodon-bird-ui-auto', 'default')
    end
  end

  describe 'BlueLab labels' do
    it 'uses the BlueLab name in supported fallback locales' do
      expect(I18n.t('themes.mastodon-bird-ui-auto', locale: :en)).to eq('BlueLab')
      expect(I18n.t('themes.mastodon-bird-ui-auto', locale: :'pt-BR')).to eq('BlueLab')
    end
  end
end
