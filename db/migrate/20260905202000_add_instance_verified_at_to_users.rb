# frozen_string_literal: true

class AddInstanceVerifiedAtToUsers < ActiveRecord::Migration[8.1]
  INSTANCE_VERIFICATION_PERMISSION_MASK = 2_031_613

  def up
    add_column :users, :instance_verified_at, :datetime

    # Existing role-change audit entries are used only once to preserve the best
    # historical assignment date available before this dedicated timestamp
    # existed. New verification changes are persisted directly on users.
    execute <<~SQL.squish
      UPDATE users
      SET instance_verified_at = (
        SELECT MAX(admin_action_logs.created_at)
        FROM admin_action_logs
        WHERE admin_action_logs.action = 'change_role'
          AND admin_action_logs.target_type = 'User'
          AND admin_action_logs.target_id = users.id
      )
      FROM user_roles
      WHERE users.role_id = user_roles.id
        AND (
          LOWER(BTRIM(user_roles.name)) IN ('verified', 'verificado', 'trusted verified', 'vf')
          OR (user_roles.permissions & #{INSTANCE_VERIFICATION_PERMISSION_MASK}) <> 0
        )
        AND EXISTS (
          SELECT 1
          FROM admin_action_logs
          WHERE admin_action_logs.action = 'change_role'
            AND admin_action_logs.target_type = 'User'
            AND admin_action_logs.target_id = users.id
        )
    SQL
  end

  def down
    remove_column :users, :instance_verified_at
  end
end
