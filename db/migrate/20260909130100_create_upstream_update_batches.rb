# frozen_string_literal: true

class CreateUpstreamUpdateBatches < ActiveRecord::Migration[8.1]
  def change
    create_table :upstream_update_batches do |t|
      t.string :repository, null: false
      t.string :channel, null: false
      t.string :base_sha, null: false
      t.string :head_sha, null: false
      t.integer :total_commits, default: 0, null: false
      t.integer :additions, default: 0, null: false
      t.integer :deletions, default: 0, null: false
      t.jsonb :commits, default: [], null: false
      t.jsonb :files, default: [], null: false
      t.boolean :truncated, default: false, null: false
      t.datetime :detected_at, null: false
      t.datetime :reviewed_at

      t.timestamps
    end

    add_index :upstream_update_batches, [:repository, :channel, :head_sha], unique: true, name: 'index_upstream_update_batches_on_source_and_head'
    add_index :upstream_update_batches, :reviewed_at, where: 'reviewed_at IS NULL'
  end
end
