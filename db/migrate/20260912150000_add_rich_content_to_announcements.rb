# frozen_string_literal: true

class AddRichContentToAnnouncements < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def up
    add_column :announcements, :content_type, :string, default: 'text/plain', null: false unless column_exists?(:announcements, :content_type)
    add_reference :media_attachments, :announcement, index: false unless column_exists?(:media_attachments, :announcement_id)
    add_index :media_attachments, :announcement_id, algorithm: :concurrently unless index_exists?(:media_attachments, :announcement_id)
  end

  def down
    remove_index :media_attachments, :announcement_id, algorithm: :concurrently if index_exists?(:media_attachments, :announcement_id)
    remove_reference :media_attachments, :announcement, index: false if column_exists?(:media_attachments, :announcement_id)
    remove_column :announcements, :content_type if column_exists?(:announcements, :content_type)
  end
end
