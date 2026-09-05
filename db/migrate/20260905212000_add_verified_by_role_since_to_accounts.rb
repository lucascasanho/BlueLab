# frozen_string_literal: true

class AddVerifiedByRoleSinceToAccounts < ActiveRecord::Migration[8.1]
  def change
    add_column :accounts, :verified_by_role_since, :datetime
  end
end
