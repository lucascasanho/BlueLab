# frozen_string_literal: true

class FetchRemoteInstanceVerificationService < BaseService
  CAPABILITY_CACHE_TTL = 1.week
  THREADS_RESULT_CACHE_TTL = 1.day
  THREADS_HTML_BODY_LIMIT = 2.megabytes
  THREADS_PROFILE_WINDOW = 2.kilobytes
  THREADS_ACTOR_HOSTS = %w(threads.net www.threads.net).freeze
  THREADS_BROWSER_HEADERS = {
    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language' => 'en-US,en;q=0.9',
    'Sec-CH-UA' => '"Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-CH-UA-Mobile' => '?0',
    'Sec-CH-UA-Platform' => '"Linux"',
    'Sec-Fetch-Dest' => 'document',
    'Sec-Fetch-Mode' => 'navigate',
    'Sec-Fetch-Site' => 'none',
    'Sec-Fetch-User' => '?1',
    'Upgrade-Insecure-Requests' => '1',
    'User-Agent' => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  }.freeze
  BLUELAB_SOURCE_URLS = %w(
    https://github.com/lucascasanho/BlueLab
    https://github.com/MastodonBlue/BlueLab
  ).freeze

  def call(account)
    return unless account&.remote? && !account.suspended?
    return if account.remote_instance_verification['source'] == 'activitypub'
    return fetch_threads_verification(account) if threads_actor?(account)

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

  def fetch_threads_verification(account)
    return unless ENV['THREADS_VERIFICATION_LOOKUP_ENABLED'] == 'true'

    result = Rails.cache.fetch(
      ['threads-profile-verification', account.username.downcase],
      expires_in: THREADS_RESULT_CACHE_TTL,
      skip_nil: true
    ) { fetch_threads_result(account) }
    return if result.nil?

    verification = result['verified'] ? threads_verification : {}
    return if !result['verified'] && account.remote_instance_verification['source'] != 'threads'

    account.update_column(:remote_instance_verification, verification) if account.remote_instance_verification != verification
  end

  def fetch_threads_result(account)
    api_result = fetch_threads_api_result(account) if ENV['THREADS_PROFILE_DISCOVERY_ACCESS_TOKEN'].present?
    api_result || fetch_threads_html_result(account)
  end

  def fetch_threads_api_result(account)
    payload = fetch_json(
      threads_api_url(account),
      'Authorization' => "Bearer #{ENV.fetch('THREADS_PROFILE_DISCOVERY_ACCESS_TOKEN')}"
    )
    return unless matching_threads_profile?(payload, account)

    { 'verified' => payload['is_verified'] }
  rescue HTTP::Error, JSON::ParserError, Mastodon::Error
    nil
  end

  def fetch_threads_html_result(account)
    body = fetch_html(threads_profile_url(account))
    return if body.nil?

    marker = %("username":#{account.username.downcase.to_json})
    offset = 0

    while (position = body.index(marker, offset))
      match = body.byteslice(position, THREADS_PROFILE_WINDOW)&.match(/"is_verified":(true|false)/)
      return { 'verified' => match[1] == 'true' } if match

      offset = position + marker.bytesize
    end
  end

  def threads_verification
    {
      'source' => 'threads',
      'issuer' => 'Threads',
      'badge' => InstanceVerification.threads_badge,
    }
  end

  def threads_actor?(account)
    THREADS_ACTOR_HOSTS.include?(Addressable::URI.parse(account.uri).host&.downcase)
  rescue Addressable::URI::InvalidURIError
    false
  end

  def matching_threads_profile?(payload, account)
    payload.is_a?(Hash) &&
      [true, false].include?(payload['is_verified']) &&
      payload['username'].to_s.casecmp(account.username).zero?
  end

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

  def fetch_json(url, headers = {})
    Request.new(:get, url).add_headers({ 'Accept' => 'application/json' }.merge(headers)).perform do |response|
      next unless response.code == 200

      JSON.parse(response.body_with_limit)
    end
  end

  def fetch_html(url)
    Request.new(:get, url).add_headers(THREADS_BROWSER_HEADERS).perform do |response|
      next unless response.code == 200

      response.body_with_limit(THREADS_HTML_BODY_LIMIT)
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

  def threads_api_url(account)
    Addressable::URI.new(
      scheme: 'https',
      host: 'graph.threads.net',
      path: '/v1.0/profile_lookup',
      query_values: { username: account.username }
    ).to_s
  end

  def threads_profile_url(account)
    Addressable::URI.new(scheme: 'https', host: 'www.threads.com', path: "/@#{account.username}").to_s
  end
end
