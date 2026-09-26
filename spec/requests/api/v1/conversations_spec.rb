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

    it 'collapses multiple account conversations from one native thread' do
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

      expect(
        AccountConversation.where(
          account: user.account,
          conversation_id: first.conversation_id,
        ).count
      ).to eq(2)

      get '/api/v1/conversations', headers: headers

      thread_rows = response.parsed_body.select do |conversation|
        conversation[:conversation_id] == first.conversation_id.to_s
      end

      expect(thread_rows.size).to eq(1)
      expect(thread_rows.first[:accounts].size).to eq(2)
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
  end

  describe 'GET /api/v1/conversations/:id/messages', :inline_jobs do
    it 'returns all messages from the same native conversation when participant sets change' do
      first = PostStatusService.new.call(
        other.account,
        text: 'First @alice',
        visibility: :direct,
      )
      other_two = Fabricate(:user)
      second = PostStatusService.new.call(
        other_two.account,
        text: '@alice Second',
        visibility: :direct,
        thread: first,
      )

      expect(second.conversation_id).to eq(first.conversation_id)

      conversation = AccountConversation.find_by(
        account: user.account,
        conversation_id: first.conversation_id,
      )

      expect(conversation).to be_present

      get "/api/v1/conversations/#{conversation.id}/messages", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body.map { |status| status[:id] })
        .to contain_exactly(first.id.to_s, second.id.to_s)
    end

    it 'does not mix statuses from another thread with the same participants' do
      first = PostStatusService.new.call(
        other.account,
        text: 'First @alice',
        visibility: :direct,
      )
      second = PostStatusService.new.call(
        other.account,
        text: 'Second @alice',
        visibility: :direct,
      )

      conversation = AccountConversation.where(
        account: user.account,
        conversation_id: first.conversation_id,
      ).first

      expect(conversation).to be_present

      alternate_thread = Conversation.create!
      AccountConversation.create!(
        account: user.account,
        conversation: alternate_thread,
        participant_account_ids: [other.account.id],
        status_ids: [second.id],
        unread: false,
      )

      conversation.update!(status_ids: [first.id])

      get "/api/v1/conversations/#{conversation.id}/messages", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body.map { |status| status[:id] }).to eq([first.id.to_s])
    end
  end
end
