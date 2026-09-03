# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Themes do
  it 'keeps BlueLab registered alongside Bird UI and Vanilla' do
    expect(described_class.instance.names).to include('blue-2', 'mastodon-bird-ui-auto', 'default')
  end

  it 'keeps the BlueLab stylesheet entrypoint in the repository' do
    expect(Rails.root.join('app/javascript/styles/blue-2-v7.scss')).to exist
  end
end
