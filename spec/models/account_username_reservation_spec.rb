# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AccountUsernameReservation do
  it 'reserves usernames case-insensitively at the database boundary' do
    account = Fabricate(:account, username: 'reserved_name')

    expect do
      described_class.create!(account: Fabricate(:account), username: account.username.upcase, relinquished_at: Time.now.utc)
    end.to raise_error(ActiveRecord::RecordInvalid)
  end

  it 'keeps historical reservations when an account is deleted' do
    account = Fabricate(:account)
    reservation = account.username_reservations.sole

    account.destroy!

    expect(reservation.reload.account_id).to be_nil
  end

  it 'accepts the dotted username used by local application actors' do
    account = Fabricate(:account, actor_type: 'Application', username: 'application.internal')

    expect(account.username_reservations.sole.username).to eq('application.internal')
  end

  it 'lets an application actor reclaim an orphaned reservation' do
    original_account = Fabricate(:account, username: 'application.internal')
    reservation = original_account.username_reservations.sole
    original_account.destroy!

    application_account = Fabricate(:account, actor_type: 'Application', username: 'application.internal')

    expect(reservation.reload).to have_attributes(account: application_account, relinquished_at: nil)
  end
end
