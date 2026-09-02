# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Themes do
  describe '#names' do
    it 'keeps the BlueLab theme available alongside Vanilla' do
      expect(described_class.instance.names).to include('mastodon-bird-ui-auto', 'default')
    end
  end
end
