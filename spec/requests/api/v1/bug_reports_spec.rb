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
          'id' => be_present
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
        account: user.account
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
          current_path: '/settings/preferences',
          request_id: nil,
          user_agent: nil
        )
      end
    end

    context 'when an authenticated user opts out of identification' do
      let(:params) { super().merge(anonymous: 'true') }

      it 'keeps diagnostics but does not associate the report with the user' do
        subject

        expect(response).to have_http_status(201)
        expect(BugReport.last).to have_attributes(
          account: nil,
          current_path: '/settings/preferences',
          interface_language: 'pt-BR',
          request_id: nil,
          user_agent: nil
        )
      end
    end

    context 'when notifying staff about a new report' do
      let!(:moderator_role) do
        Fabricate(:user_role, name: 'Bug report moderator', permissions: UserRole::FLAGS[:manage_reports])
      end
      let!(:moderator) { Fabricate(:user, role: moderator_role) }
      let!(:admin_role) do
        Fabricate(:user_role, name: 'Bug report administrator', permissions: UserRole::FLAGS[:administrator])
      end
      let!(:administrator) { Fabricate(:user, role: admin_role) }

      it 'creates an in-app notification for every account with moderation permissions' do
        subject
        report = BugReport.last

        [moderator, administrator].each do |staff|
          expect(
            Notification.exists?(
              account: staff.account,
              type: 'admin.bug_report',
              activity: report
            )
          ).to be true
        end
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
