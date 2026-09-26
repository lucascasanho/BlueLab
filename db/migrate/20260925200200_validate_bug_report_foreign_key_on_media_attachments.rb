# frozen_string_literal: true

class ValidateBugReportForeignKeyOnMediaAttachments < ActiveRecord::Migration[8.0]
  def change
    validate_foreign_key :media_attachments, :bug_reports, column: :bug_report_id
  end
end
