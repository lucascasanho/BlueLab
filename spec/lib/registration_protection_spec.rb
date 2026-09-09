# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RegistrationProtection do
  let(:session) { {} }

  around do |example|
    ClimateControl.modify BLUELAB_REGISTRATION_PROTECTION: 'true' do
      example.run
    end
  end

  describe '.issue_intent and .consume_intent' do
    it 'accepts a matching intent exactly once' do
      token = described_class.issue_intent(session)

      expect(described_class.consume_intent(session, token)).to be true
      expect(described_class.consume_intent(session, token)).to be false
    end

    it 'rejects an intent from another session' do
      token = described_class.issue_intent(session)

      expect(described_class.consume_intent({}, token)).to be false
      expect(described_class.consume_intent(session, token)).to be true
    end

    it 'revokes the previous intent when a new one is issued' do
      previous_token = described_class.issue_intent(session)
      current_token = described_class.issue_intent(session)

      session[:registration_intent_token] = previous_token
      expect(described_class.consume_intent(session, previous_token)).to be false

      session[:registration_intent_token] = current_token
      expect(described_class.consume_intent(session, current_token)).to be true
    end
  end

  describe '.known_automation_application?' do
    it 'matches the complete observed probe signature' do
      params = {
        client_name: 'BoomProtocolProbe',
        redirect_uris: ['urn:ietf:wg:oauth:2.0:oob'],
        website: 'https://example.com',
      }

      expect(described_class.known_automation_application?(params)).to be true
    end

    it 'does not block an application based only on one shared attribute' do
      params = {
        client_name: 'BoomProtocolProbe',
        redirect_uris: ['https://client.example/callback'],
        website: 'https://client.example',
      }

      expect(described_class.known_automation_application?(params)).to be false
    end
  end
end
