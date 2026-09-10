# frozen_string_literal: true

class UpstreamSoftwareUpdateCheckService < BaseService
  API_ROOT = 'https://api.github.com'
  API_VERSION = '2022-11-28'
  MAX_COMMITS = 100
  MAX_MESSAGE_LENGTH = 20_000
  CHANNEL_PATTERN = %r{\A[a-zA-Z0-9_./-]+\z}

  class FetchError < StandardError; end

  def call
    return unless UpstreamUpdateBatch.check_enabled?

    @check = UpstreamUpdateCheck.find_or_initialize_by(repository: repository, channel: channel)
    @check.last_sha.present? ? check_from_cursor! : bootstrap!
  rescue *Mastodon::HTTP_CONNECTION_ERRORS, Mastodon::HostValidationError, Mastodon::LengthValidationError, JSON::ParserError, FetchError, ActiveRecord::RecordInvalid, KeyError, TypeError => e
    record_error!(e)
  end

  private

  def bootstrap!
    recent_commits = fetch_json("/repos/#{repository}/commits?#{URI.encode_www_form(sha: channel, since: lookback.ago.iso8601, per_page: MAX_COMMITS)}")
    raise FetchError, 'GitHub commits response is not a list' unless recent_commits.is_a?(Array)

    if recent_commits.empty?
      head = fetch_json("/repos/#{repository}/commits/#{CGI.escape(channel)}")
      advance_cursor!(head.fetch('sha'))
      return
    end

    oldest_parent = recent_commits.last.fetch('parents', []).first&.fetch('sha', nil)
    unless oldest_parent
      advance_cursor!(recent_commits.first.fetch('sha'))
      return
    end

    process_comparison!(fetch_comparison(oldest_parent), bootstrap_truncated: recent_commits.size >= MAX_COMMITS)
  end

  def check_from_cursor!
    process_comparison!(fetch_comparison(@check.last_sha))
  end

  def fetch_comparison(base_sha)
    fetch_json("/repos/#{repository}/compare/#{base_sha}...#{CGI.escape(channel)}")
  end

  def process_comparison!(comparison, bootstrap_truncated: false)
    raise FetchError, 'GitHub comparison response is not an object' unless comparison.is_a?(Hash)

    commits = comparison.fetch('commits', [])
    head_sha = commits.last&.fetch('sha', nil) || comparison.dig('base_commit', 'sha')
    raise FetchError, 'GitHub comparison did not include a head commit' if head_sha.blank?

    if comparison['status'] == 'identical' || commits.empty?
      advance_cursor!(head_sha)
      return
    end

    raise FetchError, "GitHub comparison status is #{comparison['status'].inspect}" unless comparison['status'] == 'ahead'

    files = comparison.fetch('files', [])
    attributes = {
      repository: repository,
      channel: channel,
      base_sha: comparison.fetch('base_commit').fetch('sha'),
      head_sha: head_sha,
      total_commits: comparison.fetch('total_commits', commits.size),
      commits: commits.map { |commit| commit_attributes(commit) },
      files: files.map { |file| file_attributes(file) },
      additions: files.sum { |file| file.fetch('additions', 0) },
      deletions: files.sum { |file| file.fetch('deletions', 0) },
      truncated: bootstrap_truncated || comparison.fetch('total_commits', commits.size) > commits.size || files.size >= 300,
      detected_at: Time.current,
    }

    UpstreamUpdateBatch.transaction do
      UpstreamUpdateBatch.create_with(attributes).find_or_create_by!(repository: repository, channel: channel, head_sha: head_sha)
      advance_cursor!(head_sha)
    end
  end

  def commit_attributes(commit)
    data = commit.fetch('commit', {})
    author = data.fetch('author', {})
    verification = data.fetch('verification', {})

    {
      sha: commit.fetch('sha'),
      message: data.fetch('message', '').truncate(MAX_MESSAGE_LENGTH),
      author: author.fetch('name', ''),
      committed_at: author['date'],
      verified: verification.fetch('verified', false),
    }
  end

  def file_attributes(file)
    {
      filename: file.fetch('filename'),
      status: file.fetch('status', 'modified'),
      additions: file.fetch('additions', 0),
      deletions: file.fetch('deletions', 0),
      changes: file.fetch('changes', 0),
    }
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
      'User-Agent' => 'Mastodon BlueLab upstream update checker',
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
    Rails.logger.warn("Upstream commit check failed: #{error.class}: #{error.message}")
    @check&.update!(last_checked_at: Time.current, last_error: "#{error.class}: #{error.message}".truncate(2_000))
    nil
  end

  def repository
    UpstreamUpdateBatch.official_repository
  end

  def channel
    @channel ||= UpstreamUpdateBatch.monitored_channel.tap do |value|
      raise FetchError, 'Invalid upstream channel' unless CHANNEL_PATTERN.match?(value)
    end
  end

  def lookback
    Rails.configuration.x.mastodon.upstream_initial_lookback_hours.hours
  end
end
