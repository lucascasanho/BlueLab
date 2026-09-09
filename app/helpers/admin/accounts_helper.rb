# frozen_string_literal: true

module Admin::AccountsHelper
  def admin_accounts_moderation_options
    [
      [t('admin.accounts.moderation.active'), 'active'],
      [t('admin.accounts.moderation.silenced'), 'silenced'],
      [t('admin.accounts.moderation.disabled'), 'disabled'],
      [t('admin.accounts.moderation.suspended'), 'suspended'],
      [safe_join([t('admin.accounts.moderation.pending'), "(#{pending_user_count_label})"], ' '), 'pending'],
      [safe_join([t('admin.accounts.moderation.unconfirmed'), "(#{unconfirmed_user_count_label})"], ' '), 'unconfirmed'],
    ]
  end

  private

  def pending_user_count_label
    number_with_delimiter User.pending_review.count
  end

  def unconfirmed_user_count_label
    number_with_delimiter User.unconfirmed.count
  end
end
