# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Auth::SessionsController do
  render_views

  before do
    request.env['devise.mapping'] = Devise.mappings[:user]
  end

  describe 'POST #create from public overview routes' do
    let(:user) { Fabricate(:user, email: 'overview-login@example.com', password: 'abcdefgh') }

    it 'redirects the overview page to home after a successful login' do
      allow(controller).to receive(:stored_location_for).with(:user).and_return('/overview')

      post :create, params: { user: { email: user.email, password: user.password } }

      expect(response).to redirect_to(root_path)
      expect(controller.current_user).to eq user
    end

    it 'redirects the overview about page to home after a successful login' do
      allow(controller).to receive(:stored_location_for).with(:user).and_return('/overview/about')

      post :create, params: { user: { email: user.email, password: user.password } }

      expect(response).to redirect_to(root_path)
      expect(controller.current_user).to eq user
    end
  end
end
