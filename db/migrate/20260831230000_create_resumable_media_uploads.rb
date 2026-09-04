# frozen_string_literal: true

class CreateResumableMediaUploads < ActiveRecord::Migration[8.1]
  def change
    create_table :resumable_media_uploads do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.references :media_attachment, null: true, foreign_key: { on_delete: :nullify }
      t.string :public_id, null: false
      t.string :original_filename, null: false
      t.string :declared_content_type
      t.bigint :expected_size, null: false
      t.integer :chunk_size, null: false
      t.integer :chunk_count, null: false
      t.integer :state, null: false, default: 0
      t.string :error_code
      t.string :sha256, limit: 64
      t.datetime :last_activity_at, null: false
      t.datetime :expires_at, null: false
      t.datetime :completed_at
      t.integer :lock_version, null: false, default: 0
      t.timestamps
    end

    add_index :resumable_media_uploads, :public_id, unique: true
    add_index :resumable_media_uploads, [:account_id, :state]
    add_index :resumable_media_uploads, [:state, :expires_at]

    create_table :resumable_media_upload_parts do |t|
      t.references :resumable_media_upload, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.integer :part_index, null: false
      t.integer :byte_size, null: false
      t.string :sha256, null: false, limit: 64
      t.timestamps
    end

    add_index :resumable_media_upload_parts,
              [:resumable_media_upload_id, :part_index],
              unique: true,
              name: 'index_resumable_upload_parts_on_upload_and_index'
  end
end
