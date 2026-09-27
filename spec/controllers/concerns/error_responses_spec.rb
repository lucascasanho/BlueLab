# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ErrorResponses do
  render_views

  shared_examples 'error response' do |code|
    before do
      Setting.theme = 'blue-2'
      routes.draw { get 'show' => 'anonymous#show' }
    end

    it "returns http #{code} and renders the BlueLab error template" do
      get 'show'

      expect(response)
        .to have_http_status(code)
      expect(response.parsed_body)
        .to have_css('body.error--bluelab[data-theme="blue-2"]')
        .and have_css('.error-page__code', text: code.to_s)
        .and have_css('h1', text: error_content(code))
        .and have_css('form.error-page__report-form[action^="/bug_reports/new"]')
        .and have_css('button.error-page__report', text: I18n.t('bug_reports.link'))
    end

    def error_content(code)
      I18n.t("errors.#{code}")
        .then { |value| I18n.t("errors.#{code}.content") if value.is_a?(Hash) }
    end
  end

  describe 'bad_request' do
    controller(ApplicationController) do
      def show = bad_request
    end

    it_behaves_like 'error response', 400
  end

  describe 'forbidden' do
    controller(ApplicationController) do
      def show = forbidden
    end

    it_behaves_like 'error response', 403
  end

  describe 'gone' do
    controller(ApplicationController) do
      def show = gone
    end

    it_behaves_like 'error response', 410
  end

  describe 'internal_server_error' do
    controller(ApplicationController) do
      def show = internal_server_error
    end

    it_behaves_like 'error response', 500
  end

  describe 'not_acceptable' do
    controller(ApplicationController) do
      def show = not_acceptable
    end

    it_behaves_like 'error response', 406
  end

  describe 'not_found' do
    controller(ApplicationController) do
      def show = not_found
    end

    it_behaves_like 'error response', 404
  end

  describe 'service_unavailable' do
    controller(ApplicationController) do
      def show = service_unavailable
    end

    it_behaves_like 'error response', 503
  end

  describe 'too_many_requests' do
    controller(ApplicationController) do
      def show = too_many_requests
    end

    it_behaves_like 'error response', 429
  end

  describe 'unprocessable_content' do
    controller(ApplicationController) do
      def show = unprocessable_content
    end

    it_behaves_like 'error response', 422
  end

  context 'with ActionController::RoutingError' do
    controller(ApplicationController) do
      def show
        raise ActionController::RoutingError, ''
      end
    end

    it_behaves_like 'error response', 404
  end

  context 'with ActiveRecord::RecordNotFound' do
    controller(ApplicationController) do
      def show
        raise ActiveRecord::RecordNotFound, ''
      end
    end

    it_behaves_like 'error response', 404
  end

  context 'with ActionController::InvalidAuthenticityToken' do
    controller(ApplicationController) do
      def show
        raise ActionController::InvalidAuthenticityToken, ''
      end
    end

    it_behaves_like 'error response', 422
  end

  context 'when the instance defaults to BlueLab but the signed-in user chose another theme' do
    controller(ApplicationController) do
      def show = not_found
    end

    let(:user) { Fabricate(:user) }

    before do
      Setting.theme = 'blue-2'
      user.settings.update(bluelab_theme: 'default', noindex: false)
      allow(controller).to receive(:current_user).and_return(user)
      routes.draw { get 'show' => 'anonymous#show' }
    end

    it 'uses the standard Mastodon error page for that user' do
      get 'show'

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body)
        .to have_css('body.error')
        .and have_no_css('body.error--bluelab')
        .and have_no_css('.error-page')
        .and have_css('.dialog')
    end
  end

  context 'when the BlueLab error layout is rendered with a 200 response' do
    controller(ApplicationController) do
      def show
        render 'errors/500', layout: 'error', formats: [:html], status: :ok
      end
    end

    before do
      Setting.theme = 'blue-2'
      routes.draw { get 'show' => 'anonymous#show' }
    end

    it 'keeps the bug-report shortcut as a native GET form' do
      get 'show'

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body)
        .to have_css('body.error--bluelab[data-theme="blue-2"]')
        .and have_css('.error-page__code', text: '200')
        .and have_css('form.error-page__report-form[action*="error_page=200"]')
        .and have_css('button.error-page__report', text: I18n.t('bug_reports.link'))
    end
  end
end
