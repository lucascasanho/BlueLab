# frozen_string_literal: true

class AddRichContentToAnnouncements < ActiveRecord::Migration[8.1]
  def change
    add_column :announcements, :content_type, :string, default: 'text/plain', null: false
    add_reference :media_attachments, :announcement, foreign_key: true
  end
end
