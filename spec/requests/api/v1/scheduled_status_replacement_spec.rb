# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Scheduled status full replacement' do
  include_context 'with API authentication', oauth_scopes: 'read:statuses write:statuses'

  let(:scheduled_status) do
    Fabricate(
      :scheduled_status,
      account: user.account,
      params: {
        text: 'Original',
        spoiler_text: 'Old CW',
        visibility: 'public',
        language: 'en',
        content_type: 'text/plain',
      }
    )
  end

  it 'replaces all editable fields while retaining native ownership checks' do
    media = Fabricate(:media_attachment, account: user.account)

    put "/api/v1/scheduled_statuses/#{scheduled_status.id}/replace",
        headers:,
        params: {
          status: 'Edited **Markdown**',
          spoiler_text: 'New CW',
          visibility: 'private',
          language: 'pt',
          content_type: 'text/markdown',
          sensitive: true,
          media_ids: [media.id.to_s],
          scheduled_at: 3.hours.from_now.iso8601,
        },
        as: :json

    expect(response).to have_http_status(200)
    replacement = user.account.scheduled_statuses.find(response.parsed_body['id'])
    expect(replacement.params).to include(
      'text' => 'Edited **Markdown**',
      'spoiler_text' => 'New CW',
      'visibility' => 'private',
      'language' => 'pt',
      'content_type' => 'text/markdown',
      'sensitive' => true
    )
    expect(media.reload.scheduled_status).to eq(replacement)
  end

  it 'returns not found and changes nothing for another account' do
    foreign = Fabricate(:scheduled_status)

    put "/api/v1/scheduled_statuses/#{foreign.id}/replace",
        headers:,
        params: { status: 'Unauthorized edit', scheduled_at: 3.hours.from_now.iso8601 },
        as: :json

    expect(response).to have_http_status(404)
    expect(foreign.reload.params['text']).to_not eq('Unauthorized edit')
  end
end
