# frozen_string_literal: true

class Scheduler::StatusHeartbeatScheduler
  include Sidekiq::Worker

  TOKEN_CONTEXT = 'bluelab-status-heartbeat-v1'

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 2.minutes.to_i

  def perform
    Request.new(:post, heartbeat_url, body: '')
      .add_headers(
        'Authorization' => "Bearer #{heartbeat_token}",
        'Content-Type' => 'application/json',
        'User-Agent' => 'BlueLab status heartbeat'
      )
      .perform do |response|
        next if response.code.between?(200, 299)

        Rails.logger.warn("BlueLab status heartbeat returned HTTP #{response.code}")
      end
  rescue Mastodon::HostValidationError, *Mastodon::HTTP_CONNECTION_ERRORS => e
    Rails.logger.warn("BlueLab status heartbeat failed: #{e.class}")
  end

  private

  def heartbeat_url
    ENV['STATUS_HEARTBEAT_URL'].presence || "https://status.#{ENV.fetch('LOCAL_DOMAIN')}/api/heartbeat/sidekiq"
  end

  def heartbeat_token
    OpenSSL::HMAC.hexdigest('SHA256', ENV.fetch('SECRET_KEY_BASE'), TOKEN_CONTEXT)
  end
end
