# frozen_string_literal: true

class AddAnnouncementForeignKeyToMediaAttachments < ActiveRecord::Migration[8.0]
  def change
    add_foreign_key :media_attachments, :announcements, column: :announcement_id, on_delete: :nullify, validate: false
  end
end
