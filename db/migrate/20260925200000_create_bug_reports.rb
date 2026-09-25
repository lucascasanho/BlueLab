# frozen_string_literal: true

class CreateBugReports < ActiveRecord::Migration[8.0]
  def change
    create_table :bug_reports do |t|
      t.references :account, null: false, foreign_key: true
      t.text :description, null: false
      t.integer :status, null: false, default: 0
      t.references :assigned_account, foreign_key: { to_table: :accounts }
      t.references :resolved_by_account, foreign_key: { to_table: :accounts }
      t.datetime :resolved_at

      t.string :browser
      t.string :browser_version
      t.string :operating_system
      t.string :operating_system_version
      t.string :interface_language
      t.string :theme
      t.string :interface_layout
      t.string :current_path
      t.string :viewport
      t.string :app_version
      t.string :request_id
      t.text :user_agent
      t.jsonb :client_errors, null: false, default: []

      t.timestamps
    end

    add_reference :media_attachments, :bug_report, foreign_key: true, index: true
  end
end
