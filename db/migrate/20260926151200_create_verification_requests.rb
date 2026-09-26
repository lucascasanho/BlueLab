# frozen_string_literal: true

class CreateVerificationRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :verification_requests do |t|
      t.references :account, null: false, foreign_key: true
      t.text :explanation, null: false, default: ''
      t.integer :status, null: false, default: 0
      t.references :resolved_by_account, foreign_key: { to_table: :accounts }
      t.datetime :resolved_at

      t.timestamps
    end

    add_index :verification_requests, [:account_id, :created_at], order: { created_at: :desc }
    add_index :verification_requests,
              :account_id,
              unique: true,
              where: "status = 0",
              name: 'index_verification_requests_on_account_id_pending'
  end
end
