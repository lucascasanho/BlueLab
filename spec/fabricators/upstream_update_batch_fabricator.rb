# frozen_string_literal: true

Fabricator(:upstream_update_batch) do
  repository 'mastodon/mastodon'
  channel 'main'
  base_sha { sequence(:upstream_base_sha) { |i| format('%040x', i) } }
  head_sha { sequence(:upstream_head_sha) { |i| format('%040x', i + 10_000) } }
  total_commits 0
  additions 0
  deletions 0
  commits do |attrs|
    [{
      kind: UpstreamUpdateBatch::VERSION_METADATA_KIND,
      version: '99.0.0-alpha.1',
      release_type: 'prerelease',
      url: "https://github.com/mastodon/mastodon/commit/#{attrs[:head_sha]}",
    }]
  end
  files { [] }
  detected_at { Time.current }
end
