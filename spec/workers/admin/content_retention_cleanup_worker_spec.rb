# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Admin::ContentRetentionCleanupWorker do
  subject(:perform) { described_class.new.perform }

  let(:remote_status) { Fabricate(:status, account: Fabricate(:account, domain: 'remote.example')) }
  let(:local_status) { Fabricate(:status) }
  let!(:old_remote_media) { Fabricate(:media_attachment, remote_url: 'https://remote.example/old.png', status: remote_status, created_at: 15.days.ago, updated_at: 15.days.ago) }
  let!(:recent_remote_media) { Fabricate(:media_attachment, remote_url: 'https://remote.example/recent.png', status: remote_status, created_at: 13.days.ago, updated_at: 13.days.ago) }
  let!(:old_local_media) { Fabricate(:media_attachment, status: local_status, created_at: 30.days.ago, updated_at: 30.days.ago) }
  let!(:link_preview_card) { Fabricate(:preview_card, type: :link) }
  let!(:photo_preview_card) { Fabricate(:preview_card, type: :photo) }

  it 'clears only old remote media and cached link preview images' do
    perform

    expect(old_remote_media.reload.file).to be_blank
    expect(recent_remote_media.reload.file).to_not be_blank
    expect(old_local_media.reload.file).to_not be_blank
    expect(link_preview_card.reload.image).to be_blank
    expect(photo_preview_card.reload.image).to_not be_blank
  end

  it 'preserves all database records' do
    expect { perform }
      .to not_change(MediaAttachment, :count)
      .and not_change(PreviewCard, :count)
  end
end
