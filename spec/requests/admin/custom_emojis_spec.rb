# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin Custom Emojis' do
  describe 'POST /admin/custom_emojis' do
    before { sign_in Fabricate(:admin_user) }

    it 'gracefully handles invalid nested params' do
      post admin_custom_emojis_path(custom_emoji: 'invalid')

      expect(response)
        .to have_http_status(400)
    end
  end
describe 'GET /admin/custom_emojis/:id/edit' do
    before { sign_in Fabricate(:admin_user) }

    it 'renders the shortcode editor for a local emoji' do
      custom_emoji = Fabricate(:custom_emoji, shortcode: 'party_blob')

      get edit_admin_custom_emoji_path(custom_emoji)

      expect(response).to have_http_status(200)
      expect(response.body).to include('party_blob')
    end
  end

  describe 'PATCH /admin/custom_emojis/:id' do
    before { sign_in Fabricate(:admin_user) }

    it 'renames a local emoji shortcode' do
      custom_emoji = Fabricate(:custom_emoji, shortcode: 'party_blob')

      patch admin_custom_emoji_path(custom_emoji), params: {
        custom_emoji: { shortcode: 'party_hat' },
      }

      expect(response).to redirect_to(admin_custom_emojis_path(local: '1'))
      expect(custom_emoji.reload.shortcode).to eq('party_hat')
    end

    it 'does not rename a remote emoji' do
      custom_emoji = Fabricate(:custom_emoji, shortcode: 'party_blob', domain: 'example.com')

      patch admin_custom_emoji_path(custom_emoji), params: {
        custom_emoji: { shortcode: 'party_hat' },
      }

      expect(response).to redirect_to(admin_custom_emojis_path)
      expect(custom_emoji.reload.shortcode).to eq('party_blob')
    end
  end
end
