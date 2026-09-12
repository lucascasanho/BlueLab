# frozen_string_literal: true

class AddRichContentToAnnouncements < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def change
    add_column :announcements, :content_type, :string, default: 'text/plain', null: false
    add_reference :media_attachments, :announcement, index: { algorithm: :concurrently }
  end
end
