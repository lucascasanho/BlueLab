# frozen_string_literal: true

class AddComposeFieldsToAnnouncements < ActiveRecord::Migration[8.0]
  def change
    add_column :announcements, :markdown_enabled, :boolean, default: false, null: false
    add_reference :media_attachments, :announcement, foreign_key: { on_delete: :nullify }, index: true
  end
end
