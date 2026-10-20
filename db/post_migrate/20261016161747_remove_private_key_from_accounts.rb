# frozen_string_literal: true

class RemovePrivateKeyFromAccounts < ActiveRecord::Migration[8.1]
  def up
    safety_assured do
      remove_column :accounts, :private_key, :text, null: true if column_exists?(:accounts, :private_key)
    end
  end

  def down
    safety_assured do
      add_column :accounts, :private_key, :text, null: true unless column_exists?(:accounts, :private_key)
    end
  end
end
