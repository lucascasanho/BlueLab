# frozen_string_literal: true

# == Schema Information
#
# Table name: user_roles
#
#  id               :bigint(8)        not null, primary key
#  collection_limit :integer          default(10), not null
#  color            :string           default("") , not null
#  highlighted      :boolean          default(FALSE), not null
#  name             :string           default("") , not null
#  permissions      :bigint(8)        default(0), not null
#  position         :integer          default(0), not null
#  require_2fa      :boolean          default(FALSE), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#

class UserRole < ApplicationRecord
  FLAGS = {
    administrator: (1 << 0),
    view_devops: (1 << 1),
    view_audit_log: (1 << 2),
    view_dashboard: (1 << 3),
    manage_reports: (1 << 4),
    manage_federation: (1 << 5),
    manage_settings: (1 << 6),
    manage_blocks: (1 << 7),
    manage_taxonomies: (1 << 8),
    manage_appeals: (1 << 9),
    manage_users: (1 << 10),
    manage_invites: (1 << 11),
    manage_rules: (1 << 12),
    manage_announcements: (1 << 13),
    manage_custom_emojis: (1 << 14),
    manage_webhooks: (1 << 15),
    invite_users: (1 << 16),
    manage_roles: (1 << 17),
    manage_user_access: (1 << 18),
    delete_user_data: (1 << 19),
    view_feeds: (1 << 20),
    invite_bypass_approval: (1 << 21),
    manage_email_subscriptions: (1 << 22),
  }.freeze

  EVERYONE_ROLE_ID = -99
  NOBODY_POSITION = -1

  POSITION_LIMIT = (2**31) - 1
  CSS_COLORS = /\A#?(?:[A-F0-9]{3}){1,2}\z/i # CSS-style hex colors

  module Flags
    NONE = 0
    ALL  = FLAGS.values.reduce(&:|)

    DEFAULT = FLAGS[:invite_users]
    SAFE = FLAGS[:invite_users] | FLAGS[:invite_bypass_approval]

    CATEGORIES = {
      invites: %i(
        invite_users
        invite_bypass_approval
      ).freeze,

      email: %i(
        manage_email_subscriptions
      ).freeze,

      moderation: %i(
        view_dashboard
        view_audit_log
        manage_users
        manage_user_access
        delete_user_data
        manage_reports
        manage_appeals
        manage_federation
        manage_blocks
        manage_taxonomies
        manage_invites
        view_feeds
      ).freeze,

      administration: %i(
        manage_settings
        manage_rules
        manage_roles
        manage_webhooks
        manage_custom_emojis
        manage_announcements
      ).freeze,

      devops: %i(
        view_devops
      ).freeze,

      special: %i(
        administrator
      ).freeze,
    }.freeze
  end

  INSTANCE_VERIFICATION_ROLE_NAMES = [
    'verified',
    'verificado',
    'trusted verified',
    'vf',
  ].freeze

  INSTANCE_VERIFICATION_PRIVILEGES = (
    Flags::CATEGORIES[:moderation] +
    Flags::CATEGORIES[:administration] +
    Flags::CATEGORIES[:special]
  ).freeze

  INSTANCE_VERIFICATION_PERMISSION_MASK = INSTANCE_VERIFICATION_PRIVILEGES.reduce(Flags::NONE) do |mask, privilege|
    mask | FLAGS.fetch(privilege)
  end

  attr_writer :current_account

  validates :name, presence: true, unless: :everyone?
  validates :color, format: { with: CSS_COLORS }, if: :color?
  validates :position, numericality: { in: (-POSITION_LIMIT..POSITION_LIMIT) }
  validates :collection_limit, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  validate :validate_permissions_elevation
  validate :validate_position_elevation
  validate :validate_dangerous_permissions
  validate :validate_own_role_edition

  before_validation :set_position

  scope :assignable, -> { where.not(id: EVERYONE_ROLE_ID).order(position: :asc) }

  has_many :users, inverse_of: :role, foreign_key: 'role_id', dependent: :nullify

  after_update :sync_instance_verification_timestamps, if: :saved_instance_verification_definition_change?
  before_destroy :clear_instance_verification_timestamps, prepend: true

  def self.nobody
    @nobody ||= UserRole.new(permissions: Flags::NONE, position: NOBODY_POSITION)
  end

  def self.everyone
    UserRole.find(EVERYONE_ROLE_ID)
  rescue ActiveRecord::RecordNotFound
    UserRole.create!(id: EVERYONE_ROLE_ID, permissions: Flags::DEFAULT)
  end

  def self.that_can(*any_of_privileges)
    all.select { |role| role.can?(*any_of_privileges) }
  end

  def self.instance_verification_eligible_values?(name, permissions)
    INSTANCE_VERIFICATION_ROLE_NAMES.include?(name.to_s.strip.downcase) ||
      (permissions.to_i & INSTANCE_VERIFICATION_PERMISSION_MASK).positive?
  end

  def everyone?
    id == EVERYONE_ROLE_ID
  end

  def nobody?
    id.nil?
  end

  def instance_verification_eligible?
    return false if everyone? || nobody?
    return true if administrator?

    self.class.instance_verification_eligible_values?(name, permissions)
  end

  def permissions_as_keys
    FLAGS.keys.select { |privilege| permissions & FLAGS[privilege] == FLAGS[privilege] }.map(&:to_s)
  end

  def permissions_as_keys=(value)
    self.permissions = value.filter_map(&:presence).reduce(Flags::NONE) { |bitmask, privilege| FLAGS.key?(privilege.to_sym) ? (bitmask | FLAGS[privilege.to_sym]) : bitmask }
  end

  def can?(*any_of_privileges)
    any_of_privileges.any? { |privilege| in_permissions?(privilege) }
  end

  def overrides?(other_role)
    other_role.nil? || position > other_role.position
  end

  def bypass_block?(role)
    overrides?(role) && highlighted? && can?(*Flags::CATEGORIES[:moderation])
  end

  def computed_permissions
    # If called on the everyone role, no further computation needed
    return permissions if everyone?

    # If called on the nobody role, no permissions are there to be given
    return Flags::NONE if nobody?

    # Otherwise, compute permissions based on special conditions
    @computed_permissions ||= begin
      permissions = self.class.everyone.permissions | self.permissions

      if administrator?
        Flags::ALL
      else
        permissions
      end
    end
  end

  def to_log_human_identifier
    name
  end

  def administrator?
    permissions & FLAGS[:administrator] == FLAGS[:administrator]
  end

  private

  def in_permissions?(privilege)
    raise ArgumentError, "Unknown privilege: #{privilege}" unless FLAGS.key?(privilege)

    computed_permissions & FLAGS[privilege] == FLAGS[privilege]
  end

  def set_position
    self.position = NOBODY_POSITION if everyone?
  end

  def saved_instance_verification_definition_change?
    saved_change_to_name? || saved_change_to_permissions?
  end

  def sync_instance_verification_timestamps
    previous_name = saved_change_to_name&.first || name
    previous_permissions = saved_change_to_permissions&.first || permissions
    was_eligible = !everyone? && self.class.instance_verification_eligible_values?(previous_name, previous_permissions)
    is_eligible = instance_verification_eligible?

    return if was_eligible == is_eligible

    users.update_all(instance_verified_at: is_eligible ? Time.current : nil)
  end

  def clear_instance_verification_timestamps
    users.update_all(instance_verified_at: nil)
  end

  def validate_own_role_edition
    return unless defined?(@current_account) && @current_account.user_role.id == id

    errors.add(:permissions_as_keys, :own_role) if permissions_changed?
    errors.add(:position, :own_role) if position_changed?
    errors.add(:require_2fa, :own_role) if require_2fa_changed? && !administrator?
  end

  def validate_permissions_elevation
    errors.add(:permissions_as_keys, :elevated) if defined?(@current_account) && @current_account.user_role.computed_permissions & permissions != permissions
  end

  def validate_position_elevation
    errors.add(:position, :elevated) if defined?(@current_account) && @current_account.user_role.position < position
  end

  def validate_dangerous_permissions
    errors.add(:permissions_as_keys, :dangerous) if everyone? && Flags::SAFE & permissions != permissions
  end
end
