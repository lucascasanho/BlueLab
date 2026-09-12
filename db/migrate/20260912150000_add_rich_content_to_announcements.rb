# frozen_string_literal: true

class AddRichContentToAnnouncements < ActiveRecord::Migration[8.0]
  def change
    add_column :announcements, :content_type, :string, default: 'text/plain', null: false
    add_reference :media_attachments, :announcement, foreign_key: { on_delete: :nullify }, index: true
  end
end
