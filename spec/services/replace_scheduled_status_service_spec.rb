# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ReplaceScheduledStatusService do
  subject(:replace) do
    described_class.new.call(
      scheduled_status,
      options: {
        text: 'Edited **Markdown**',
        spoiler_text: 'New CW',
        visibility: 'private',
        language: 'pt',
        content_type: 'text/markdown',
        media_ids: [media.id.to_s],
        scheduled_at: 3.hours.from_now,
      },
      application: nil
    )
  end

  let(:account) { Fabricate(:account) }
  let(:media) { Fabricate(:media_attachment, account:) }
  let(:scheduled_status) { Fabricate(:scheduled_status, account:, params: { text: 'Original', spoiler_text: 'Old CW', visibility: 'public', language: 'en' }) }

  it 'replaces all editable fields transactionally and preserves media ownership' do
    replacement = replace

    expect(replacement).to be_a(ScheduledStatus)
    expect(replacement.id).to_not eq(scheduled_status.id)
    expect(replacement.params).to include(
      'text' => 'Edited **Markdown**',
      'spoiler_text' => 'New CW',
      'visibility' => 'private',
      'language' => 'pt',
      'content_type' => 'text/markdown'
    )
    expect(media.reload.scheduled_status).to eq(replacement)
  end

  it 'rolls back the original when the replacement is invalid' do
    invalid_options = { text: '', scheduled_at: 3.hours.from_now }

    expect do
      described_class.new.call(scheduled_status, options: invalid_options, application: nil)
    end.to raise_error(ActiveRecord::RecordInvalid)

    expect(scheduled_status.reload).to be_persisted
  end
end
