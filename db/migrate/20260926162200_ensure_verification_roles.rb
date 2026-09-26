# frozen_string_literal: true

class EnsureVerificationRoles < ActiveRecord::Migration[8.1]
  VERIFICATION_ROLE_NAMES = %w(Verificado Verified).freeze

  def up
    VERIFICATION_ROLE_NAMES.each do |name|
      UserRole.find_or_create_by!(name:) do |role|
        role.permissions = UserRole::Flags::NONE
        role.position = 0
        role.highlighted = false
      end
    end
  end

  def down
    # Verification roles are intentionally not removed on rollback so that
    # existing manual role assignments are never destroyed.
  end
end
