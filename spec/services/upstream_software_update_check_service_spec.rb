# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UpstreamSoftwareUpdateCheckService do
  subject(:service) { described_class.new }

  let(:repository) { 'mastodon/mastodon' }
  let(:channel) { 'main' }
  let(:base_sha) { 'a' * 40 }
  let(:head_sha) { 'b' * 40 }
  let(:next_sha) { 'c' * 40 }
  let(:committed_at) { Time.utc(2026, 9, 9, 12) }

  around do |example|
    original_enabled = Rails.configuration.x.mastodon.upstream_commit_check_enabled
    original_repository = Rails.configuration.x.mastodon.upstream_repository
    original_channel = Rails.configuration.x.mastodon.upstream_channel
    original_lookback = Rails.configuration.x.mastodon.upstream_initial_lookback_hours
    Rails.configuration.x.mastodon.upstream_commit_check_enabled = true
    Rails.configuration.x.mastodon.upstream_repository = repository
    Rails.configuration.x.mastodon.upstream_channel = channel
    Rails.configuration.x.mastodon.upstream_initial_lookback_hours = 24
    example.run
  ensure
    Rails.configuration.x.mastodon.upstream_commit_check_enabled = original_enabled
    Rails.configuration.x.mastodon.upstream_repository = original_repository
    Rails.configuration.x.mastodon.upstream_channel = original_channel
    Rails.configuration.x.mastodon.upstream_initial_lookback_hours = original_lookback
  end

  def commit_json(sha, parent_sha)
    {
      sha: sha,
      parents: [{ sha: parent_sha }],
      commit: {
        message: "Improve composer\n\nPreserve drafts across reconnects.",
        author: { name: 'Mastodon contributor', date: committed_at.iso8601 },
        verification: { verified: true },
      },
    }
  end

  def comparison_json(from_sha: base_sha, commits: [commit_json(head_sha, base_sha)])
    {
      status: 'ahead',
      total_commits: commits.size,
      base_commit: { sha: from_sha },
      commits: commits,
      files: [
        { filename: 'app/javascript/mastodon/features/compose/index.tsx', status: 'modified', additions: 20, deletions: 4, changes: 24 },
      ],
    }
  end

  describe '#call' do
    it 'bootstraps from the lookback window and records one official commit' do
      freeze_time(committed_at) do
        stub_request(:get, %r{api\.github\.com/repos/mastodon/mastodon/commits\?}).to_return(status: 200, body: [commit_json(head_sha, base_sha)].to_json)
        stub_request(:get, "https://api.github.com/repos/#{repository}/compare/#{base_sha}...#{channel}").to_return(status: 200, body: comparison_json.to_json)

        expect { service.call }.to change(UpstreamUpdateBatch, :count).by(1)
      end

      batch = UpstreamUpdateBatch.last
      expect(batch).to have_attributes(head_sha: head_sha, total_commits: 1, additions: 20, deletions: 4)
      expect(batch.commits.first).to include('message' => include('Preserve drafts'), 'verified' => true)
      expect(UpstreamUpdateCheck.last).to have_attributes(last_sha: head_sha, last_error: nil)
    end

    it 'ignores a configured repository override and only queries official Mastodon' do
      Rails.configuration.x.mastodon.upstream_repository = 'example/bluelab'
      stub_request(:get, %r{api\.github\.com/repos/mastodon/mastodon/commits\?}).to_return(status: 200, body: [commit_json(head_sha, base_sha)].to_json)
      stub_request(:get, "https://api.github.com/repos/mastodon/mastodon/compare/#{base_sha}...#{channel}").to_return(status: 200, body: comparison_json.to_json)

      expect { service.call }.to change(UpstreamUpdateBatch.where(repository: 'mastodon/mastodon'), :count).by(1)
      expect(a_request(:get, %r{api\.github\.com/repos/example/bluelab/})).to_not have_been_made
    end

    it 'uses the persisted cursor after restart and records the next commit only once' do
      Fabricate(:upstream_update_batch, repository: repository, channel: channel, base_sha: base_sha, head_sha: head_sha)
      UpstreamUpdateCheck.create!(repository: repository, channel: channel, last_sha: head_sha)
      next_comparison = comparison_json(from_sha: head_sha, commits: [commit_json(next_sha, head_sha)])
      stub_request(:get, "https://api.github.com/repos/#{repository}/compare/#{head_sha}...#{channel}").to_return(status: 200, body: next_comparison.to_json)

      expect { service.call }.to change(UpstreamUpdateBatch, :count).by(1)

      identical = { status: 'identical', total_commits: 0, base_commit: { sha: next_sha }, commits: [], files: [] }
      stub_request(:get, "https://api.github.com/repos/#{repository}/compare/#{next_sha}...#{channel}").to_return(status: 200, body: identical.to_json)
      expect { described_class.new.call }.to not_change(UpstreamUpdateBatch, :count)
      expect(UpstreamUpdateCheck.last.last_sha).to eq next_sha
    end

    it 'records an API error without moving the cursor' do
      check = UpstreamUpdateCheck.create!(repository: repository, channel: channel, last_sha: base_sha)
      stub_request(:get, "https://api.github.com/repos/#{repository}/compare/#{base_sha}...#{channel}").to_return(status: 429)

      service.call

      expect(check.reload).to have_attributes(last_sha: base_sha, last_error: include('HTTP 429'))
    end

    it 'does nothing when monitoring is disabled' do
      Rails.configuration.x.mastodon.upstream_commit_check_enabled = false

      expect { service.call }.to not_change(UpstreamUpdateCheck, :count)
    end
  end
end
