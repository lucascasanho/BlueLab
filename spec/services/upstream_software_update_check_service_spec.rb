# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UpstreamSoftwareUpdateCheckService do
  subject(:service) { described_class.new }

  let(:repository) { 'mastodon/mastodon' }
  let(:channel) { 'main' }
  let(:base_sha) { 'a' * 40 }
  let(:head_sha) { 'b' * 40 }
  let(:next_sha) { 'c' * 40 }
  let(:release_sha) { 'd' * 40 }

  around do |example|
    original_enabled = Rails.configuration.x.mastodon.upstream_commit_check_enabled
    original_repository = Rails.configuration.x.mastodon.upstream_repository
    original_channel = Rails.configuration.x.mastodon.upstream_channel
    Rails.configuration.x.mastodon.upstream_commit_check_enabled = true
    Rails.configuration.x.mastodon.upstream_repository = repository
    Rails.configuration.x.mastodon.upstream_channel = channel
    example.run
  ensure
    Rails.configuration.x.mastodon.upstream_commit_check_enabled = original_enabled
    Rails.configuration.x.mastodon.upstream_repository = original_repository
    Rails.configuration.x.mastodon.upstream_channel = original_channel
  end

  before do
    allow(Mastodon::Version).to receive(:gem_version).and_return(Gem::Version.new('4.8.0-alpha.2'))
  end

  def version_source(prerelease)
    <<~RUBY
      module Mastodon
        module Version
          def major
            4
          end

          def minor
            8
          end

          def patch
            0
          end

          def default_prerelease
            #{prerelease.nil? ? 'nil' : prerelease.inspect}
          end
        end
      end
    RUBY
  end

  def version_file_response(prerelease)
    {
      encoding: 'base64',
      content: Base64.strict_encode64(version_source(prerelease)),
    }
  end

  def stub_head(sha)
    stub_request(:get, "https://api.github.com/repos/#{repository}/commits/#{channel}")
      .to_return(status: 200, body: { sha: sha }.to_json)
  end

  def stub_version(sha, prerelease)
    stub_request(:get, "https://api.github.com/repos/#{repository}/contents/lib/mastodon/version.rb?ref=#{sha}")
      .to_return(status: 200, body: version_file_response(prerelease).to_json)
  end

  def stub_releases(releases = [])
    stub_request(:get, "https://api.github.com/repos/#{repository}/releases?per_page=30")
      .to_return(status: 200, body: releases.to_json)
  end

  describe '#call' do
    it 'ignores ordinary upstream commits when the declared Mastodon version did not change' do
      check = UpstreamUpdateCheck.create!(repository: repository, channel: channel, last_sha: base_sha)
      stub_head(head_sha)
      stub_version(head_sha, 'alpha.2')
      stub_releases(
        [
          { tag_name: 'v4.7.1', draft: false, prerelease: false, html_url: 'https://github.com/mastodon/mastodon/releases/tag/v4.7.1', published_at: '2026-09-01T14:00:36Z' },
        ]
      )

      expect { service.call }.to not_change(UpstreamUpdateBatch, :count)
      expect(check.reload).to have_attributes(last_sha: head_sha, last_error: nil)
    end

    it 'records an official prerelease once when the development version advances' do
      check = UpstreamUpdateCheck.create!(repository: repository, channel: channel, last_sha: base_sha)
      stub_head(head_sha)
      stub_version(head_sha, 'alpha.3')
      stub_releases

      expect { service.call }.to change(UpstreamUpdateBatch, :count).by(1)

      batch = UpstreamUpdateBatch.last
      expect(batch).to have_attributes(channel: channel, head_sha: head_sha, total_commits: 0)
      expect(batch.version).to eq '4.8.0-alpha.3'
      expect(batch).to be_prerelease
      expect(check.reload.last_sha).to eq head_sha

      stub_head(next_sha)
      stub_version(next_sha, 'alpha.3')
      stub_releases

      expect { described_class.new.call }.to not_change(UpstreamUpdateBatch, :count)
      expect(check.reload.last_sha).to eq next_sha
    end

    it 'checks the declared version even when the old commit cursor already points at the current head' do
      UpstreamUpdateCheck.create!(repository: repository, channel: channel, last_sha: head_sha)
      stub_head(head_sha)
      stub_version(head_sha, 'alpha.3')
      stub_releases

      expect { service.call }.to change(UpstreamUpdateBatch, :count).by(1)
      expect(UpstreamUpdateBatch.last.version).to eq '4.8.0-alpha.3'
    end

    it 'records a published stable release that is newer than the running prerelease' do
      UpstreamUpdateCheck.create!(repository: repository, channel: channel, last_sha: head_sha)
      stub_head(head_sha)
      stub_version(head_sha, 'alpha.2')
      stub_releases(
        [
          { tag_name: 'v4.8.0', draft: false, prerelease: false, html_url: 'https://github.com/mastodon/mastodon/releases/tag/v4.8.0', published_at: '2026-10-01T12:00:00Z' },
        ]
      )
      stub_request(:get, "https://api.github.com/repos/#{repository}/commits/v4.8.0")
        .to_return(status: 200, body: { sha: release_sha }.to_json)

      expect { service.call }.to change(UpstreamUpdateBatch, :count).by(1)

      batch = UpstreamUpdateBatch.last
      expect(batch).to have_attributes(channel: UpstreamUpdateBatch::STABLE_RELEASE_CHANNEL, head_sha: release_sha)
      expect(batch.version).to eq '4.8.0'
      expect(batch).to be_stable_release
      expect(batch.release_url).to end_with('/releases/tag/v4.8.0')
    end

    it 'does not treat a non-prerelease declaration on main as a stable release' do
      check = UpstreamUpdateCheck.create!(repository: repository, channel: channel, last_sha: base_sha)
      stub_head(head_sha)
      stub_version(head_sha, nil)
      stub_releases

      expect { service.call }.to not_change(UpstreamUpdateBatch, :count)
      expect(check.reload.last_sha).to eq head_sha
    end

    it 'records an API error without moving the cursor' do
      check = UpstreamUpdateCheck.create!(repository: repository, channel: channel, last_sha: base_sha)
      stub_head(head_sha)
      stub_version(head_sha, 'alpha.2')
      stub_request(:get, "https://api.github.com/repos/#{repository}/releases?per_page=30").to_return(status: 429)

      service.call

      expect(check.reload).to have_attributes(last_sha: base_sha, last_error: include('HTTP 429'))
    end

    it 'does nothing when monitoring is disabled' do
      Rails.configuration.x.mastodon.upstream_commit_check_enabled = false

      expect { service.call }.to not_change(UpstreamUpdateCheck, :count)
    end
  end
end
