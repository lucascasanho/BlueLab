# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Public bug reports' do
  describe 'GET /bug_reports/new' do
    it 'renders for anonymous visitors' do
      get '/bug_reports/new'

      expect(response).to have_http_status(200)
      expect(response.body).to include('bug-report-form')
      expect(response.body).to include('data-turbo="false"')
    end

    it 'renders with error-page context when reached from an error page' do
      get new_bug_report_path(error_page: '200', current_path: '')

      expect(response).to have_http_status(200)
      expect(response.body).to include('bug-report-form')
      expect(response.body).to include('Este relato foi iniciado na página de erro')
    end

    it 'renders when reached from the login page' do
      get new_bug_report_path(current_path: '/auth/sign_in')

      expect(response).to have_http_status(200)
      expect(response.body).to include('bug-report-form')
    end
  end

  describe 'auth page shortcuts' do
    shared_examples 'an auth page with a bug-report shortcut' do |path|
      it "exposes the direct bug-report link on #{path}" do
        get path

        expect(response).to have_http_status(200)
        expect(response.parsed_body)
          .to have_css('form.bug-report-shortcut[action^="/bug_reports/new"]')
          .and have_button(I18n.t('bug_reports.link'))
      end
    end

    before do
      Setting.registrations_mode = 'open'
    end

    it_behaves_like 'an auth page with a bug-report shortcut', '/auth/sign_in'
    it_behaves_like 'an auth page with a bug-report shortcut', '/auth/password/new'
    it_behaves_like 'an auth page with a bug-report shortcut', '/auth/confirmation/new'
    it_behaves_like 'an auth page with a bug-report shortcut', '/auth/sign_up'
  end

  describe 'POST /bug_reports' do
    let(:params) do
      {
        description: 'The page failed while I was trying to recover my account.',
        current_path: '/auth/password/new',
        error_page: '500',
        interface_language: 'pt-BR',
        theme: 'blue-2',
        interface_layout: 'auth',
        viewport: '1280x720@1',
        client_errors: [].to_json,
      }
    end

    it 'creates a report without an account' do
      post '/bug_reports', params: params

      expect(response).to have_http_status(200)
      expect(BugReport.last).to have_attributes(
        account: nil,
        error_page: '500',
        current_path: '/auth/password/new',
        request_id: nil,
        user_agent: nil
      )
    end
  end
end
