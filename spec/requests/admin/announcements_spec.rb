# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Admin Announcements' do
  describe 'POST /admin/announcements' do
    let(:admin_user) { Fabricate(:admin_user) }

    before { sign_in admin_user }

    it 'gracefully handles invalid nested params' do
      post admin_announcements_path(announcement: 'invalid')

      expect(response)
        .to have_http_status(400)
    end

    it 'attaches media owned by the administrator account' do
      media = Fabricate(:media_attachment, account: admin_user.account)

      post admin_announcements_path, params: { announcement: { text: 'Notice', content_type: 'text/markdown', media_attachment_ids: [media.id] } }

      expect(response).to redirect_to(admin_announcements_path)
      expect(media.reload.announcement).to eq(Announcement.last)
    end

    it 'rejects media owned by another account' do
      media = Fabricate(:media_attachment)

      expect do
        post admin_announcements_path, params: { announcement: { text: 'Notice', content_type: 'text/markdown', media_attachment_ids: [media.id] } }
      end.to_not change(Announcement, :count)

      expect(response).to have_http_status(422)
      expect(media.reload.announcement).to be_nil
    end

    it 'rejects more than four attachments' do
      media_ids = Fabricate.times(5, :media_attachment, account: admin_user.account).map(&:id)

      expect do
        post admin_announcements_path, params: { announcement: { text: 'Notice', content_type: 'text/markdown', media_attachment_ids: media_ids } }
      end.to_not change(Announcement, :count)

      expect(response).to have_http_status(422)
    end
  end
end
