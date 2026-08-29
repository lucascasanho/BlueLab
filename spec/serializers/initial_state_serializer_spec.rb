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
end
