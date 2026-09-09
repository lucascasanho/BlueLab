# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Scheduled threads' do
  include_context 'with API authentication', oauth_scopes: 'read:statuses write:statuses'

  let(:scheduled_at) { 2.hours.from_now.iso8601 }
  let(:items) do
    [
      { status: 'First', spoiler_text: 'CW', visibility: 'private', language: 'pt', content_type: 'text/markdown' },
      { status: 'Second', visibility: 'private', language: 'pt', content_type: 'text/plain' },
      { status: 'Third', visibility: 'private', language: 'en', content_type: 'text/markdown' },
    ]
  end

  describe 'POST /api/v1/scheduled_threads' do
    it 'creates one durable thread containing ordered native scheduled statuses' do
      expect do
        post '/api/v1/scheduled_threads', headers: headers.merge('Idempotency-Key' => 'thread-key'), params: { scheduled_at:, items: }, as: :json
      end.to change(ScheduledThread, :count).by(1).and change(ScheduledStatus, :count).by(3)

      expect(response).to have_http_status(200)
      thread = user.account.scheduled_threads.first
      expect(thread.scheduled_statuses.pluck(:thread_position)).to eq([0, 1, 2])
      expect(thread.scheduled_statuses.first.params).to include('text' => 'First', 'spoiler_text' => 'CW', 'language' => 'pt', 'content_type' => 'text/markdown')

      post '/api/v1/scheduled_threads', headers: headers.merge('Idempotency-Key' => 'thread-key'), params: { scheduled_at:, items: }, as: :json
      expect(user.account.scheduled_threads.count).to eq(1)
    end
  end

  describe 'ownership' do
    let(:other_thread) { Fabricate(:scheduled_thread) }

    it 'does not list, update, retry, or destroy another account thread' do
      get '/api/v1/scheduled_threads', headers: headers
      expect(response.parsed_body).to eq([])

      put "/api/v1/scheduled_threads/#{other_thread.id}", headers: headers, params: { scheduled_at: 3.hours.from_now.iso8601 }
      expect(response).to have_http_status(404)

      post "/api/v1/scheduled_threads/#{other_thread.id}/retry", headers: headers
      expect(response).to have_http_status(404)

      delete "/api/v1/scheduled_threads/#{other_thread.id}", headers: headers
      expect(response).to have_http_status(404)
      expect(ScheduledThread.exists?(other_thread.id)).to be true
    end
  end

  describe 'native scheduled-status listing' do
    it 'lists a thread only as its logical unit, not again as independent posts' do
      CreateScheduledThreadService.new.call(
        user.account,
        items: items.first(2).map { |item| item.transform_keys { |key| key == :status ? :text : key } },
        scheduled_at: 2.hours.from_now,
        application: token.application
      )

      get '/api/v1/scheduled_statuses', headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body).to eq([])
    end
  end

  describe 'update and cancel' do
    let!(:thread) do
      service_items = items.map do |item|
        item.to_h.transform_keys { |key| key == :status ? :text : key }
      end
      CreateScheduledThreadService.new.call(user.account, items: service_items, scheduled_at: 2.hours.from_now, application: token.application)
    end

    it 'atomically replaces content and changes the publishing time' do
      media = Fabricate(:media_attachment, account: user.account)
      replacement_time = 4.hours.from_now
      replacement = [items.first.merge(status: 'Edited'), items.second.merge(media_ids: [media.id.to_s])]

      put "/api/v1/scheduled_threads/#{thread.id}", headers: headers, params: { scheduled_at: replacement_time.iso8601, items: replacement }, as: :json

      expect(response).to have_http_status(200)
      expect(thread.reload.scheduled_at).to be_within(1.second).of(replacement_time)
      expect(thread.scheduled_statuses.map { |item| item.params['text'] }).to eq(['Edited', 'Second'])
      expect(media.reload.scheduled_status).to eq(thread.scheduled_statuses.second)
    end

    it 'cancels every remaining item without deleting already-published statuses' do
      published = Fabricate(:status, account: user.account)
      thread.scheduled_statuses.first.update!(published_status_id: published.id)

      delete "/api/v1/scheduled_threads/#{thread.id}", headers: headers

      expect(response).to have_http_status(200)
      expect(ScheduledThread.exists?(thread.id)).to be false
      expect(Status.exists?(published.id)).to be true
    end
  end
end
