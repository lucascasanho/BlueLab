# frozen_string_literal: true

Fabricator(:upstream_update_batch) do
  repository 'mastodon/mastodon'
  channel 'main'
  base_sha { sequence(:upstream_base_sha) { |i| format('%040x', i) } }
  head_sha { sequence(:upstream_head_sha) { |i| format('%040x', i + 10_000) } }
  total_commits 1
  additions 12
  deletions 3
  commits do |attrs|
    [{
      sha: attrs[:head_sha],
      message: 'Improve the composer',
      author: 'Mastodon contributor',
      committed_at: Time.current.iso8601,
      verified: true,
    }]
  end
  files { [{ filename: 'app/javascript/mastodon/features/compose/index.tsx', status: 'modified', additions: 12, deletions: 3, changes: 15 }] }
  detected_at { Time.current }
end
