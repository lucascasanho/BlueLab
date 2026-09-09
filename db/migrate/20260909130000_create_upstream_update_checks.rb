# frozen_string_literal: true

class CreateUpstreamUpdateChecks < ActiveRecord::Migration[8.1]
  def change
    create_table :upstream_update_checks do |t|
      t.string :repository, null: false
      t.string :channel, null: false
      t.string :last_sha
      t.datetime :last_checked_at
      t.text :last_error

      t.timestamps
    end

    add_index :upstream_update_checks, [:repository, :channel], unique: true
  end
end
