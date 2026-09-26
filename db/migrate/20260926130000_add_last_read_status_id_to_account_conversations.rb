class AddLastReadStatusIdToAccountConversations < ActiveRecord::Migration[8.1]
  def up
    add_column :account_conversations, :last_read_status_id, :bigint

    execute <<~SQL.squish
      UPDATE account_conversations
      SET last_read_status_id = last_status_id
      WHERE unread = FALSE
    SQL
  end

  def down
    remove_column :account_conversations, :last_read_status_id
  end
end
