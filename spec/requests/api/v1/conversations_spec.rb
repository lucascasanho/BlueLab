# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Conversations' do
  include_context 'with API authentication', oauth_scopes: 'read:statuses'

  let!(:user) { Fabricate(:user, account_attributes: { username: 'alice' }) }

  let(:other) { Fabricate(:user) }

  describe 'GET /api/v1/conversations', :inline_jobs do
    before do
      user.account.follow!(other.account)
      PostStatusService.new.call(other.account, text: 'Hey @alice', visibility: 'direct')
      PostStatusService.new.call(user.account, text: 'Hey, nobody here', visibility: 'direct')
    end

    it 'returns pagination headers', :aggregate_failures do
      get '/api/v1/conversations', params: { limit: 1 }, headers: headers

      expect(response)
        .to have_http_status(200)
        .and include_pagination_headers(
          prev: api_v1_conversations_url(limit: 1, min_id: Status.first.id),
          next: api_v1_conversations_url(limit: 1, max_id: Status.first.id)
        )
      expect(response.content_type)
        .to start_with('application/json')
    end

    it 'returns conversations', :aggregate_failures do
      get '/api/v1/conversations', headers: headers

      expect(response.parsed_body.size).to eq 2
      expect(response.parsed_body.first[:accounts].size).to eq 1
      expect(response.parsed_body.first[:conversation_id]).to be_present
    end
    it 'collapses sent and received rows for the same participant conversation' do
      PostStatusService.new.call(
        other.account,
        text: 'Received @alice',
        visibility: :direct,
      )
      PostStatusService.new.call(
        user.account,
        text: "@#{other.account.username} Sent to Joe",
        visibility: :direct,
      )

      get '/api/v1/conversations', headers: headers

      matching_rows = response.parsed_body.select do |conversation|
        conversation[:accounts].one? && conversation[:accounts].first[:id] == other.account.id.to_s
      end

      expect(matching_rows.size).to eq(1)
    end



    context 'with since_id' do
      context 'when requesting old posts' do
        it 'returns conversations' do
          get '/api/v1/conversations', params: { since_id: Mastodon::Snowflake.id_at(1.hour.ago, with_random: false) }, headers: headers

          expect(response.parsed_body.size).to eq 2
        end
      end

      context 'when requesting posts in the future' do
        it 'returns no conversation' do
          get '/api/v1/conversations', params: { since_id: Mastodon::Snowflake.id_at(1.hour.from_now, with_random: false) }, headers: headers

          expect(response.parsed_body.size).to eq 0
        end
      end
    end
  end

  describe 'GET /api/v1/conversations/:id', :inline_jobs do
    it 'returns a conversation directly by id' do
      status = PostStatusService.new.call(
        other.account,
        text: 'Hello @alice',
        visibility: :direct,
      )
      conversation = AccountConversation.where(account: user.account).find_by(
        conversation_id: status.conversation_id,
      )

      get "/api/v1/conversations/#{conversation.id}", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body[:id]).to eq(conversation.id.to_s)
      expect(response.parsed_body[:conversation_id]).to eq(
        conversation.conversation_id.to_s,
      )
    end
  end

  describe 'DELETE /api/v1/conversations/:id', :inline_jobs do
    it 'deletes every account conversation row in the native thread' do
      first = PostStatusService.new.call(
        other.account,
        text: 'First @alice',
        visibility: :direct,
      )
      other_two = Fabricate(:user)
      PostStatusService.new.call(
        other_two.account,
        text: '@alice Second',
        visibility: :direct,
        thread: first,
      )

      conversation = AccountConversation.where(
        account: user.account,
        conversation_id: first.conversation_id,
      ).first

      expect(
        AccountConversation.where(
          account: user.account,
          conversation_id: first.conversation_id,
        ).count
      ).to eq(2)

      delete "/api/v1/conversations/#{conversation.id}", headers: headers

      expect(response).to have_http_status(200)
      expect(
        AccountConversation.where(
          account: user.account,
          conversation_id: first.conversation_id,
        ).count
      ).to eq(0)
    end
  end

  describe 'GET /api/v1/conversations/by-status/:status_id', :inline_jobs do
    it 'resolves a direct status to its conversation' do
      status = PostStatusService.new.call(
        other.account,
        text: 'Hello @alice',
        visibility: :direct,
      )
      conversation = AccountConversation.where(account: user.account).find_by(
        conversation_id: status.conversation_id,
      )

      get "/api/v1/conversations/by-status/#{status.id}", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body[:id]).to eq(conversation.id.to_s)
    end

    it 'resolves a status to the current participant conversation' do
      old_status = PostStatusService.new.call(
        other.account,
        text: 'Old @alice',
        visibility: :direct,
      )
      old_conversation = AccountConversation.where(
        account: user.account,
        participant_account_ids: [other.account.id],
      ).where(
        conversation_id: old_status.conversation_id,
      ).first

      current_status = PostStatusService.new.call(
        user.account,
        text: "@#{other.account.username} Current",
        visibility: :direct,
      )
      current_conversation = AccountConversation.where(
        account: user.account,
        participant_account_ids: [other.account.id],
      ).order(last_status_id: :desc).first

      expect(old_conversation).to be_present
      expect(current_conversation).to be_present

      get "/api/v1/conversations/by-status/#{old_status.id}", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body[:id]).to eq(old_conversation.id.to_s)

      get "/api/v1/conversations/by-status/#{current_status.id}", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body[:id]).to eq(current_conversation.id.to_s)
    end
  end

  describe 'GET /api/v1/conversations/:id/messages', :inline_jobs do
    it 'returns sent and received direct messages for the same participants' do
      received = PostStatusService.new.call(
        other.account,
        text: 'Hello @alice',
        visibility: :direct,
      )
      sent = PostStatusService.new.call(
        user.account,
        text: "@#{other.account.username} Hello Joe",
        visibility: :direct,
      )

      expect(received.conversation_id).not_to eq(sent.conversation_id)

      conversation = AccountConversation.where(
        account: user.account,
        participant_account_ids: [other.account.id],
      ).order(last_status_id: :desc).first

      expect(conversation).to be_present

      get "/api/v1/conversations/#{conversation.id}/messages", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body.map { |status| status[:id] })
        .to contain_exactly(received.id.to_s, sent.id.to_s)
    end

    it 'does not mix conversations with different participants' do
      first = PostStatusService.new.call(
        other.account,
        text: 'Hello @alice',
        visibility: :direct,
      )
      other_two = Fabricate(:user)
      second = PostStatusService.new.call(
        other_two.account,
        text: 'Hello @alice from someone else',
        visibility: :direct,
      )

      conversation = AccountConversation.where(
        account: user.account,
        participant_account_ids: [other.account.id],
      ).find_by(conversation_id: first.conversation_id)

      expect(conversation).to be_present

      get "/api/v1/conversations/#{conversation.id}/messages", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body.map { |status| status[:id] })
        .to eq([first.id.to_s])
      expect(second).to be_present
    end

  end
end
