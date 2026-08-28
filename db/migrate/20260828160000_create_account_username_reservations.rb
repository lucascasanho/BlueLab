# frozen_string_literal: true

class CreateAccountUsernameReservations < ActiveRecord::Migration[8.1]
  def up
    create_table :account_username_reservations do |t|
      t.references :account, null: true, foreign_key: { on_delete: :nullify }
      t.string :username, null: false
      t.datetime :relinquished_at
      t.timestamps
    end

    add_index :account_username_reservations,
              'lower(username)',
              unique: true,
              name: 'index_account_username_reservations_on_lower_username'
    add_index :account_username_reservations,
              :account_id,
              unique: true,
              where: 'relinquished_at IS NULL',
              name: 'index_account_username_reservations_on_current_account'

    # This is a bounded insert-only backfill (one row per local account). It does
    # not update or lock rows in accounts, and the new table is not yet consumed
    # by application code while the migration is running.
    safety_assured do
      execute <<~SQL.squish
        INSERT INTO account_username_reservations (account_id, username, created_at, updated_at)
        SELECT id, username, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM accounts
        WHERE domain IS NULL
      SQL
    end
  end

  def down
    if select_value(<<~SQL.squish)
      SELECT EXISTS (
        SELECT 1
        FROM account_username_reservations
        WHERE relinquished_at IS NOT NULL
      )
    SQL
      raise ActiveRecord::IrreversibleMigration, 'username history exists and must not be discarded'
    end

    drop_table :account_username_reservations
  end
end
