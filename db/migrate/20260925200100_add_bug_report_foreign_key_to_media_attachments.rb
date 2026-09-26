# frozen_string_literal: true

class AddBugReportForeignKeyToMediaAttachments < ActiveRecord::Migration[8.0]
  def change
    add_foreign_key :media_attachments, :bug_reports, column: :bug_report_id, on_delete: :cascade, validate: false
  end
end
