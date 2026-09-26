# frozen_string_literal: true

class AddErrorPageAndAllowAnonymousBugReports < ActiveRecord::Migration[8.0]
  def change
    change_column_null :bug_reports, :account_id, true
    add_column :bug_reports, :error_page, :string
  end
end
