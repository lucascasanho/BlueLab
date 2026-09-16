# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UpstreamUpdateBatch do
  describe '.pending?' do
    it 'does not expose legacy per-commit batches as software update alerts' do
      Fabricate(:upstream_update_batch, total_commits: 3)

      expect(described_class).to_not be_pending
      expect(described_class.pending_count).to eq 0
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
