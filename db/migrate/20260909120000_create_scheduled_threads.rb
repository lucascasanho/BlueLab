# frozen_string_literal: true

class CreateScheduledThreads < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    create_table :scheduled_threads do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.datetime :scheduled_at, null: false
      t.string :state, null: false, default: 'pending'
      t.datetime :next_retry_at
      t.integer :attempts, null: false, default: 0
      t.text :last_error
      t.string :idempotency_key
      t.timestamps
    end

    add_index :scheduled_threads, :account_id, algorithm: :concurrently
    add_index :scheduled_threads, :scheduled_at, algorithm: :concurrently
    add_index :scheduled_threads, [:state, :next_retry_at], algorithm: :concurrently
    add_index :scheduled_threads, [:account_id, :idempotency_key], unique: true, where: 'idempotency_key IS NOT NULL', algorithm: :concurrently
  end
end
