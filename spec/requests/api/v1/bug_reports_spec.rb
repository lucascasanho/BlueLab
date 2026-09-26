# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Bug reports' do
  include_context 'with API authentication', oauth_scopes: 'write:reports'

  describe 'POST /api/v1/bug_reports' do
    subject do
      post '/api/v1/bug_reports', headers: headers, params: params
    end

    let(:params) do
      {
        description: 'A button stopped responding after opening the preferences.',
        interface_language: 'pt-BR',
        theme: 'blue-2',
        interface_layout: 'single-column',
        current_path: '/settings/preferences',
        viewport: '1280x720@1',
        app_version: '4.8.0',
        client_errors: [{ type: 'javascript', message: 'TypeError: example' }].to_json,
      }
    end

    it_behaves_like 'forbidden for wrong scope', 'read read:reports'

    it 'creates the bug report', :aggregate_failures do
      subject

      expect(response).to have_http_status(201)
      expect(response.parsed_body).to match(
        a_hash_including(
          'status' => 'open',
          'id' => be_present,
        )
      )

      report = BugReport.last
      expect(report).to have_attributes(
        description: params[:description],
        interface_language: 'pt-BR',
        theme: 'blue-2',
        interface_layout: 'single-column',
        current_path: '/settings/preferences',
        viewport: '1280x720@1',
        app_version: '4.8.0',
        account: token.resource_owner.account,
      )
      expect(report.client_errors.first['type']).to eq 'javascript'
    end


    context 'when anonymous' do
      subject do
        post '/api/v1/bug_reports', params: params
      end

      it 'creates the bug report without an account' do
        subject

        expect(response).to have_http_status(201)
        expect(BugReport.last).to have_attributes(
          account: nil,
          current_path: '/settings/preferences'
        )
      end
    end

    it 'rejects an overlong description' do
      params[:description] = 'a' * (BugReport::MAX_DESCRIPTION_LENGTH + 1)

      subject

      expect(response).to have_http_status(422)
      expect(BugReport.count).to eq 0
    end
  end
end
