# frozen_string_literal: true

class AddRemoteInstanceVerificationToAccounts < ActiveRecord::Migration[8.1]
  def change
    add_column :accounts, :remote_instance_verification, :jsonb, default: {}, null: false
  end
end
