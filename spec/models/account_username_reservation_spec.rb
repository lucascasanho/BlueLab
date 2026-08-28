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
end
