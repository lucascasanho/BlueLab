# frozen_string_literal: true

class AddPasskeyToWebauthnCredentials < ActiveRecord::Migration[8.1]
  def change
    add_column :webauthn_credentials, :passkey, :boolean, default: false, null: false
  end
end
