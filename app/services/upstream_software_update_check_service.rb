# frozen_string_literal: true

require 'base64'

class UpstreamSoftwareUpdateCheckService < BaseService
  API_ROOT = 'https://api.github.com'
  API_VERSION = '2022-11-28'
  VERSION_FILE = 'lib/mastodon/version.rb'
  RELEASE_LIMIT = 30
  REPOSITORY_PATTERN = %r{\A[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+\z}
  CHANNEL_PATTERN = %r{\A[a-zA-Z0-9_./-]+\z}

  class FetchError < StandardError; end

  def call
    return unless UpstreamUpdateBatch.check_enabled?

    @check = UpstreamUpdateCheck.find_or_initialize_by(repository: repository, channel: channel)
    head_sha = fetch_channel_head_sha

    check_development_version!(head_sha) unless @check.last_sha == head_sha
    check_stable_releases!
    advance_cursor!(head_sha)
  rescue *Mastodon::HTTP_CONNECTION_ERRORS, Mastodon::HostValidationError, Mastodon::LengthValidationError, JSON::ParserError, FetchError, ActiveRecord::RecordInvalid, KeyError, TypeError, ArgumentError => e
    record_error!(e)
  end

  private

  def check_development_version!(head_sha)
    version = fetch_declared_version(head_sha)
    return unless newer_than_runtime?(version)
    return if version_already_recorded?(version)

    record_version_update!(
      channel: channel,
      head_sha: head_sha,
      version: version,
      release_type: 'prerelease',
      url: "https://github.com/#{repository}/commit/#{head_sha}"
    )
  end

  def check_stable_releases!
    releases = fetch_json("/repos/#{repository}/releases?#{URI.encode_www_form(per_page: RELEASE_LIMIT)}")
    raise FetchError, 'GitHub releases response is not a list' unless releases.is_a?(Array)

    releases.each do |release|
      next if release.fetch('draft', false) || release.fetch('prerelease', false)

      version = release_version(release['tag_name'])
      next if version.nil? || !newer_than_runtime?(version) || version_already_recorded?(version)

      head_sha = fetch_release_sha(release.fetch('tag_name'))
      record_version_update!(
        channel: UpstreamUpdateBatch::STABLE_RELEASE_CHANNEL,
        head_sha: head_sha,
        version: version,
        release_type: 'stable',
        url: release['html_url'] || "https://github.com/#{repository}/releases/tag/#{release.fetch('tag_name')}",
        published_at: release['published_at']
      )
    end
  end

  def record_version_update!(channel:, head_sha:, version:, release_type:, url:, published_at: nil)
    metadata = {
      kind: UpstreamUpdateBatch::VERSION_METADATA_KIND,
      version: version,
      release_type: release_type,
      url: url,
      published_at: published_at,
    }.compact

    UpstreamUpdateBatch.create!(
      repository: repository,
      channel: channel,
      base_sha: head_sha,
      head_sha: head_sha,
      total_commits: 0,
      commits: [metadata],
      files: [],
      additions: 0,
      deletions: 0,
      truncated: false,
      detected_at: Time.current
    )
  rescue ActiveRecord::RecordNotUnique
    nil
  end

  def version_already_recorded?(version)
    UpstreamUpdateBatch
      .for_repository(repository)
      .official_versions
      .where('commits @> ?', [{ kind: UpstreamUpdateBatch::VERSION_METADATA_KIND, version: version }].to_json)
      .exists?
  end

  def fetch_channel_head_sha
    head = fetch_json("/repos/#{repository}/commits/#{CGI.escape(channel)}")
    raise FetchError, 'GitHub channel head response is not an object' unless head.is_a?(Hash)

    head.fetch('sha')
  end

  def fetch_release_sha(tag_name)
    commit = fetch_json("/repos/#{repository}/commits/#{CGI.escape(tag_name)}")
    raise FetchError, 'GitHub release commit response is not an object' unless commit.is_a?(Hash)

    commit.fetch('sha')
  end

  def fetch_declared_version(ref)
    response = fetch_json("/repos/#{repository}/contents/#{VERSION_FILE}?#{URI.encode_www_form(ref: ref)}")
    raise FetchError, 'GitHub version file response is not an object' unless response.is_a?(Hash)
    raise FetchError, 'GitHub version file is not base64 encoded' unless response['encoding'] == 'base64'

    source = Base64.decode64(response.fetch('content'))
    parse_declared_version(source)
  end

  def parse_declared_version(source)
    major = source[/def major\s+(\d+)\s+end/m, 1]
    minor = source[/def minor\s+(\d+)\s+end/m, 1]
    patch = source[/def patch\s+(\d+)\s+end/m, 1]
    prerelease_match = source.match(/def default_prerelease\s+(?:'([^']*)'|"([^"]*)"|nil)\s+end/m)

    raise FetchError, 'Could not parse Mastodon version declaration' if major.nil? || minor.nil? || patch.nil? || prerelease_match.nil?

    version = [major, minor, patch].join('.')
    prerelease = prerelease_match[1] || prerelease_match[2]
    prerelease.present? ? "#{version}-#{prerelease}" : version
  end

  def release_version(tag_name)
    return if tag_name.blank?

    version = tag_name.delete_prefix('v')
    Gem::Version.new(version)
    version
  rescue ArgumentError
    nil
  end

  def newer_than_runtime?(version)
    Gem::Version.new(version) > Mastodon::Version.gem_version
  end

  def fetch_json(path)
    result = nil
    Request.new(:get, "#{API_ROOT}#{path}").add_headers(request_headers).perform do |response|
      raise FetchError, "GitHub API returned HTTP #{response.code}" unless response.code == 200

      result = JSON.parse(response.body_with_limit(10.megabytes))
    end
    result
  end

  def request_headers
    headers = {
      'Accept' => 'application/vnd.github+json',
      'User-Agent' => 'Mastodon BlueLab upstream version update checker',
      'X-GitHub-Api-Version' => API_VERSION,
    }
    token = ENV.fetch('GITHUB_UPSTREAM_TOKEN', nil)
    headers['Authorization'] = "Bearer #{token}" if token.present?
    headers
  end

  def advance_cursor!(sha)
    @check.update!(last_sha: sha, last_checked_at: Time.current, last_error: nil)
  end

  def record_error!(error)
    Rails.logger.warn("Upstream version check failed: #{error.class}: #{error.message}")
    @check&.update!(last_checked_at: Time.current, last_error: "#{error.class}: #{error.message}".truncate(2_000))
    nil
  end

  def repository
    @repository ||= Rails.configuration.x.mastodon.upstream_repository.tap do |value|
      raise FetchError, 'Invalid upstream repository' unless REPOSITORY_PATTERN.match?(value)
    end
  end

  def channel
    @channel ||= Rails.configuration.x.mastodon.upstream_channel.tap do |value|
      raise FetchError, 'Invalid upstream channel' unless CHANNEL_PATTERN.match?(value)
    end
  end
end
