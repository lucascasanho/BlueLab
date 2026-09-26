# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Public bug reports' do
  it 'serves the public form directly' do
    get '/bug_reports/new'

    expect(response).to have_http_status(:ok)
    expect(response).to include('bug-report-form')
  end
  describe 'GET /bug_reports/new' do
    it 'renders for anonymous visitors' do
      get '/bug_reports/new'

      expect(response).to have_http_status(:ok)
      expect(response.body).to include('bug-report-form')
    end
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
        client_errors: [].to_json
      }
    end

    it 'creates a report without an account' do
      post '/bug_reports', params: params

      expect(response).to have_http_status(:ok)
      expect(BugReport.last).to have_attributes(
        account: nil,
        error_page: '500',
        current_path: '/auth/password/new'
      )
    end
  end
end
