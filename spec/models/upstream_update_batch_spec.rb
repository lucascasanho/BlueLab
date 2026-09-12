# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UpstreamUpdateBatch do
  describe '.pending?' do
    around do |example|
      original = Rails.configuration.x.mastodon.upstream_commit_check_enabled
      Rails.configuration.x.mastodon.upstream_commit_check_enabled = true
      example.run
    ensure
      Rails.configuration.x.mastodon.upstream_commit_check_enabled = original
    end

    it 'counts only newer official version alerts that have not been reviewed' do
      Fabricate(:upstream_update_batch)
      Fabricate(:upstream_update_batch, reviewed_at: Time.current)
      Fabricate(:upstream_update_batch, commits: [{ sha: 'f' * 40, message: 'ordinary upstream commit' }], total_commits: 25)

      expect(described_class).to be_pending
      expect(described_class.pending_count).to eq 1
    end

    it 'does not count an official version that is older than the running Mastodon version' do
      Fabricate(
        :upstream_update_batch,
        commits: [
          {
            kind: described_class::VERSION_METADATA_KIND,
            version: '1.0.0',
            release_type: 'stable',
            url: 'https://github.com/mastodon/mastodon/releases/tag/v1.0.0',
          },
        ]
      )

      expect(described_class).to_not be_pending
      expect(described_class.pending_count).to eq 0
    end
  end

  describe 'version metadata' do
    it 'exposes the official version and release kind without treating metadata as commits' do
      batch = Fabricate.build(
        :upstream_update_batch,
        channel: described_class::STABLE_RELEASE_CHANNEL,
        commits: [
          {
            kind: described_class::VERSION_METADATA_KIND,
            version: '99.0.0',
            release_type: 'stable',
            url: 'https://github.com/mastodon/mastodon/releases/tag/v99.0.0',
            published_at: '2026-09-10T12:00:00Z',
          },
        ]
      )

      expect(batch.version).to eq '99.0.0'
      expect(batch).to be_stable_release
      expect(batch.release_url).to end_with('/releases/tag/v99.0.0')
      expect(batch.published_at).to eq Time.zone.parse('2026-09-10T12:00:00Z')
    end
  end

  describe '#impact_areas' do
    subject(:batch) do
      Fabricate.build(
        :upstream_update_batch,
        files: [
          { filename: 'db/migrate/20260909000000_example.rb' },
          { filename: 'app/javascript/mastodon/example.tsx' },
          { filename: 'spec/models/example_spec.rb' },
        ]
      )
    end

    it 'classifies historical changed files and flags migrations' do
      expect(batch.impact_areas).to contain_exactly(:database, :frontend, :tests)
      expect(batch.includes_migration?).to be true
    end
  end

  describe '#large?' do
    it 'keeps historical commit-batch compatibility' do
      batch = Fabricate.build(:upstream_update_batch, additions: 450, deletions: 50)

      expect(batch).to be_large
    end
  end
end
