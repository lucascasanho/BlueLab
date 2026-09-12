# frozen_string_literal: true

class ValidateAnnouncementForeignKeyOnMediaAttachments < ActiveRecord::Migration[8.0]
  def change
    validate_foreign_key :media_attachments, :announcements, column: :announcement_id
  end
end
