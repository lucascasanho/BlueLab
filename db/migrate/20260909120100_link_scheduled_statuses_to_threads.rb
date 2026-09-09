# frozen_string_literal: true

class LinkScheduledStatusesToThreads < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    safety_assured do
      add_reference :scheduled_statuses, :scheduled_thread, foreign_key: { on_delete: :cascade }, index: false
    end
    add_column :scheduled_statuses, :published_status_id, :bigint
    add_column :scheduled_statuses, :thread_position, :integer

    add_index :scheduled_statuses, :scheduled_thread_id, algorithm: :concurrently
    add_index :scheduled_statuses, :published_status_id, unique: true, where: 'published_status_id IS NOT NULL', algorithm: :concurrently
    add_index :scheduled_statuses, [:scheduled_thread_id, :thread_position], unique: true, where: 'scheduled_thread_id IS NOT NULL', algorithm: :concurrently
  end
end
