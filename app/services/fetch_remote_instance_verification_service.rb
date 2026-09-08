# frozen_string_literal: true

class FetchRemoteInstanceVerificationService < BaseService
  CAPABILITY_CACHE_TTL = 1.week
  BLUELAB_SOURCE_URLS = %w(
    https://github.com/lucascasanho/BlueLab
    https://github.com/MastodonBlue/BlueLab
  ).freeze

  def call(account)
    return unless account&.remote? && !account.suspended?
    return if account.remote_instance_verification['source'] == 'activitypub'

    instance = instance_metadata(account.domain)
    return if instance.nil?

    unless instance.fetch('supported', false)
      account.update_column(:remote_instance_verification, {}) if account.remote_instance_verification['source'] == 'rest'
      return
    end

    payload = fetch_json(account_lookup_url(account))
    return unless matching_account?(payload, account)
    return unless payload.key?('verified_by_role') || payload.key?('instance_verification')

    verification = verification_from(payload, account, instance)
    account.update_column(:remote_instance_verification, verification) if account.remote_instance_verification != verification
  end

  private

  def instance_metadata(domain)
    Rails.cache.fetch(['remote-instance-verification-capability', domain], expires_in: CAPABILITY_CACHE_TTL, skip_nil: true) do
      payload = fetch_json(instance_url(domain))
      next if payload.nil?

      {
        'supported' => bluelab_instance?(payload),
        'title' => InstanceVerification.normalize_issuer_name(payload['title'], fallback: domain),
      }
    end
  end

  def bluelab_instance?(payload)
    BLUELAB_SOURCE_URLS.include?(payload['source_url'].to_s.delete_suffix('/')) || payload['version'].to_s.match?(/\+BlueLab(?:\z|[.-])/i)
  end

  def verification_from(payload, account, instance)
    value = payload['instance_verification']
    verified = payload['verified_by_role'] == true || value.is_a?(Hash)
    return {} unless verified

    value = {} unless value.is_a?(Hash)

    {
      'source' => 'rest',
      'issuer' => InstanceVerification.normalize_issuer_name(value['issuer'], fallback: instance['title'] || account.domain),
      'verified_at' => InstanceVerification.normalize_verified_at(value['verified_at'] || payload['verified_by_role_since']),
      'badge' => InstanceVerification.normalize_badge(value['badge']),
    }.compact
  end

  def matching_account?(payload, account)
    payload.is_a?(Hash) && payload['uri'] == account.uri && payload['username'].to_s.casecmp(account.username).zero?
  end

  def fetch_json(url)
    Request.new(:get, url).add_headers('Accept' => 'application/json').perform do |response|
      next unless response.code == 200

      JSON.parse(response.body_with_limit)
    end
  end

  def instance_url(domain)
    Addressable::URI.new(scheme: 'https', host: domain, path: '/api/v2/instance').to_s
  end

  def account_lookup_url(account)
    Addressable::URI.new(
      scheme: 'https',
      host: account.domain,
      path: '/api/v1/accounts/lookup',
      query_values: { acct: account.username }
    ).to_s
  end
end
