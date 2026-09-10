# frozen_string_literal: true

class UpstreamUpdateBatch < ApplicationRecord
  VERSION_METADATA_KIND = 'version_update'
  STABLE_RELEASE_CHANNEL = 'stable-releases'

  LARGE_COMMIT_COUNT = 10
  LARGE_FILE_COUNT = 25
  LARGE_CHANGE_COUNT = 500

  IMPACT_PATHS = {
    security: %r{\A(?:app/policies/|app/controllers/auth/|app/controllers/oauth/|config/initializers/devise|lib/mastodon/cli/|security\.md)},
    database: %r{\A(?:db/|app/models/)},
    backend: %r{\A(?:app/(?:controllers|services|serializers|workers|lib)/|lib/)},
    frontend: %r{\A(?:app/javascript/|app/views/|app/helpers/)},
    dependencies: /\A(?:Gemfile|Gemfile\.lock|package\.json|yarn\.lock)/,
    infrastructure: %r{\A(?:config/|docker|Dockerfile|streaming/|\.github/)},
    translations: %r{\A(?:config/locales/|crowdin\.yml)},
    tests: %r{\A(?:spec/|test/)},
    documentation: %r{\A(?:docs/|README|CHANGELOG)},
  }.freeze

  scope :pending_review, -> { where(reviewed_at: nil) }
  scope :recent_first, -> { order(detected_at: :desc) }
  scope :for_source, ->(repository, channel) { where(repository: repository, channel: channel) }
  scope :for_repository, ->(repository) { where(repository: repository) }
  scope :official_versions, -> { where('commits @> ?', [{ kind: VERSION_METADATA_KIND }].to_json) }

  validates :repository, :channel, :base_sha, :head_sha, :detected_at, presence: true
  validates :head_sha, uniqueness: { scope: [:repository, :channel] }
  validates :base_sha, :head_sha, format: { with: /\A[0-9a-f]{40,64}\z/ }

  def self.check_enabled?
    Rails.configuration.x.mastodon.upstream_commit_check_enabled
  end

  def self.pending?
    check_enabled? && current_source.pending_review.any?(&:pending_version?)
  end

  def self.pending_count
    return 0 unless check_enabled?

    current_source.pending_review.count(&:pending_version?)
  end

  def self.current_source
    for_repository(Rails.configuration.x.mastodon.upstream_repository).official_versions
  end

  def version_metadata
    commits.find { |entry| entry['kind'] == VERSION_METADATA_KIND } || {}
  end

  def version
    version_metadata['version']
  end

  def release_type
    version_metadata['release_type']
  end

  def release_url
    version_metadata['url'].presence || compare_url
  end

  def published_at
    value = version_metadata['published_at']
    Time.zone.parse(value) if value.present?
  rescue ArgumentError, TypeError
    nil
  end

  def stable_release?
    release_type == 'stable'
  end

  def prerelease?
    release_type == 'prerelease'
  end

  def pending_version?
    reviewed_at.nil? && version.present? && Gem::Version.new(version) > Mastodon::Version.gem_version
  rescue ArgumentError
    false
  end

  def large?
    total_commits >= LARGE_COMMIT_COUNT || files.size >= LARGE_FILE_COUNT || additions + deletions >= LARGE_CHANGE_COUNT
  end

  def includes_migration?
    files.any? { |file| file['filename'].start_with?('db/migrate/') }
  end

  def impact_areas
    filenames = files.pluck('filename')
    IMPACT_PATHS.filter_map { |area, pattern| area if filenames.any? { |filename| pattern.match?(filename) } }
  end

  def compare_url
    "https://github.com/#{repository}/compare/#{base_sha}...#{head_sha}"
  end

  def commit_url(sha)
    "https://github.com/#{repository}/commit/#{sha}"
  end
end
