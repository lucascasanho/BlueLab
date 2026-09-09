# frozen_string_literal: true

# Stores the cursor for the official upstream commit feed. Keeping the cursor in
# PostgreSQL makes the checker resilient to web and Sidekiq restarts.
class UpstreamUpdateCheck < ApplicationRecord
  validates :repository, :channel, presence: true
  validates :repository, uniqueness: { scope: :channel }
  validates :last_sha, format: { with: /\A[0-9a-f]{40,64}\z/ }, allow_nil: true
end
