# frozen_string_literal: true

require 'rails_helper'

RSpec.describe InitialStateSerializer do
  subject(:meta) { described_class.new(presenter).meta }

  let(:presenter) { InitialStatePresenter.new(current_account: user.account) }

  before do
    Setting.hide_status_character_counter = false
    Setting.hide_admin_status_character_counter = true
  end

  context 'with a standard user' do
    let(:user) { Fabricate(:user) }

    it 'uses the standard counter visibility setting' do
      expect(meta[:hide_status_character_counter]).to be false
    end
  end

  context 'with an administrator' do
    let(:role) { Fabricate(:user_role, permissions_as_keys: %w(administrator)) }
    let(:user) { Fabricate(:user, role: role) }

    it 'uses the administrator counter visibility setting' do
      expect(meta[:hide_status_character_counter]).to be true
    end
  end

  context 'without a signed-in account' do
    let(:presenter) { InitialStatePresenter.new }

    it 'uses the BlueLab overview instead of the upstream about page by default' do
      Setting.landing_page = 'about'

      expect(meta[:landing_page]).to eq 'overview'
    end

    it 'preserves an explicitly configured trends landing page' do
      Setting.landing_page = 'trends'

      expect(meta[:landing_page]).to eq 'trends'
    end

    it 'preserves an explicitly configured local feed landing page' do
      Setting.landing_page = 'local_feed'

      expect(meta[:landing_page]).to eq 'local_feed'
    end
  end
end
