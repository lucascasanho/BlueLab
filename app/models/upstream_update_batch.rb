# frozen_string_literal: true

class UpstreamUpdateBatch < ApplicationRecord
  OFFICIAL_REPOSITORY = 'mastodon/mastodon'
  DEFAULT_CHANNEL = 'main'

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

  validates :repository, :channel, :base_sha, :head_sha, :detected_at, presence: true
  validates :head_sha, uniqueness: { scope: [:repository, :channel] }
  validates :base_sha, :head_sha, format: { with: /\A[0-9a-f]{40,64}\z/ }

  def self.check_enabled?
    Rails.configuration.x.mastodon.upstream_commit_check_enabled
  end

  def self.pending?
    check_enabled? && current_source.pending_review.exists?
  end

  def self.pending_count
    check_enabled? ? current_source.pending_review.sum(:total_commits) : 0
  end

  def self.current_source
    for_source(official_repository, monitored_channel)
  end

  def self.official_repository
    OFFICIAL_REPOSITORY
  end

  def self.monitored_channel
    Rails.configuration.x.mastodon.upstream_channel.presence || DEFAULT_CHANNEL
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
