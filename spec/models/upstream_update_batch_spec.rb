# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UpstreamUpdateBatch do
  describe '.pending?' do
    around do |example|
      original = Rails.configuration.x.mastodon.upstream_commit_check_enabled
      Rails.configuration.x.mastodon.upstream_commit_check_enabled = true
      example.run
      Rails.configuration.x.mastodon.upstream_commit_check_enabled = original
    end

    it 'only counts batches that have not been reviewed' do
      Fabricate(:upstream_update_batch, total_commits: 1)
      Fabricate(:upstream_update_batch, total_commits: 2, reviewed_at: Time.current)

      expect(described_class).to be_pending
      expect(described_class.pending_count).to eq 1
    end

    it 'never counts pending batches from a non-official repository' do
      Fabricate(:upstream_update_batch, total_commits: 1)
      Fabricate(:upstream_update_batch, repository: 'example/bluelab', total_commits: 20)

      expect(described_class.pending_count).to eq 1
      expect(described_class.current_source.distinct.pluck(:repository)).to eq ['mastodon/mastodon']
    end
  end

  describe '#impact_areas' do
    subject(:batch) do
      Fabricate.build(:upstream_update_batch, files: [
                        { filename: 'db/migrate/20260909000000_example.rb' },
                        { filename: 'app/javascript/mastodon/example.tsx' },
                        { filename: 'spec/models/example_spec.rb' },
                      ])
    end

    it 'classifies the changed files and flags migrations' do
      expect(batch.impact_areas).to contain_exactly(:database, :frontend, :tests)
      expect(batch.includes_migration?).to be true
    end
  end

  describe '#large?' do
    it 'identifies a large patch from its change count' do
      batch = Fabricate.build(:upstream_update_batch, additions: 450, deletions: 50)

      expect(batch).to be_large
    end
  end
end
