# frozen_string_literal: true

class RegistrationProtection
  ENABLED_ENV = 'BLUELAB_REGISTRATION_PROTECTION'
  DISABLE_API_SIGN_UP_ENV = 'BLUELAB_DISABLE_API_SIGN_UP'
  INTENT_TTL = 2.hours.freeze
  INTENT_KEY_PREFIX = 'registration_protection:intent:'

  class << self
    def enabled?
      ENV[ENABLED_ENV] == 'true'
    end

    def api_sign_up_disabled?
      enabled? && ENV.fetch(DISABLE_API_SIGN_UP_ENV, 'true') == 'true'
    end

    def issue_intent(session)
      return unless enabled?

      revoke_intent(session.delete(:registration_intent_token))

      token = SecureRandom.urlsafe_base64(32)
      session[:registration_intent_token] = token
      RedisConnection.with { |redis| redis.set(intent_key(token), '1', ex: INTENT_TTL.to_i) }
      token
    end

    def consume_intent(session, candidate)
      return true unless enabled?

      expected = session.delete(:registration_intent_token).to_s
      supplied = candidate.to_s
      return false if expected.blank? || supplied.blank? || expected.bytesize != supplied.bytesize
      return false unless ActiveSupport::SecurityUtils.secure_compare(expected, supplied)

      RedisConnection.with { |redis| redis.del(intent_key(expected)) == 1 }
    end

    def known_automation_application?(params)
      return false unless enabled?

      params[:client_name] == 'BoomProtocolProbe' &&
        Array(params[:redirect_uris]).join == 'urn:ietf:wg:oauth:2.0:oob' &&
        params[:website] == 'https://example.com'
    end

    private

    def revoke_intent(token)
      return if token.blank?

      RedisConnection.with { |redis| redis.del(intent_key(token)) }
    end

    def intent_key(token)
      "#{INTENT_KEY_PREFIX}#{Digest::SHA256.hexdigest(token)}"
    end
  end
end
