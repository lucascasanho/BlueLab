# frozen_string_literal: true

class AddContentTypeToStatusesAndStatusEdits < ActiveRecord::Migration[8.1]
  def up
    add_column :statuses, :content_type, :string, if_not_exists: true
    add_column :status_edits, :content_type, :string, if_not_exists: true
  end

  def down
    raise ActiveRecord::IrreversibleMigration, 'content_type columns may contain legacy Glitch data'
  end
end
