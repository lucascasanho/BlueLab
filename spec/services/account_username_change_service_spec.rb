# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AccountUsernameChangeService do
  subject(:change_username) { described_class.new.call(user, username:, current_password: password) }

  let(:user) { Fabricate(:user, password: 'correct-password') }
  let(:account) { user.account }
  let(:username) { 'new_username' }
  let(:password) { 'correct-password' }

  before do
    allow(ActivityPub::UpdateDistributionWorker).to receive(:perform_async)
  end

  it 'changes the username without changing federated identity or associations' do
    status = Fabricate(:status, account:)
    list = Fabricate(:list, account:)
    bookmark = Fabricate(:bookmark, account:)
    favourite = Fabricate(:favourite, account:)
    follow = Fabricate(:follow, account:)
    account_id = account.id
    actor_uri = ActivityPub::TagManager.instance.uri_for(account)
    keypairs = account.keypairs.pluck(:id, :public_key, :private_key)

    expect { change_username }.to change(account.reload, :username).to(username)

    expect(account.id).to eq(account_id)
    expect(ActivityPub::TagManager.instance.uri_for(account)).to eq(actor_uri)
    expect(account.keypairs.pluck(:id, :public_key, :private_key)).to eq(keypairs)
    expect(account.statuses).to include(status)
    expect(account.owned_lists).to include(list)
    expect(account.bookmarks).to include(bookmark)
    expect(account.favourites).to include(favourite)
    expect(account.active_relationships).to include(follow)
    expect(ActivityPub::UpdateDistributionWorker).to have_received(:perform_async).with(account.id)
  end

  it 'keeps the old username reserved and records the audit event' do
    old_username = account.username

    change_username

    expect(account.username_reservations.find_by(username: old_username).relinquished_at).to be_present
    expect(account.username_reservations.current.sole.username).to eq(username)
    expect(account.action_logs.latest.sole).to have_attributes(action: :username_change, human_identifier: "@#{old_username} → @#{username}")
  end

  it 'invalidates stale local mention entries and resolves the former username as an alias' do
    old_username = account.username
    domain = Rails.configuration.x.local_domain
    expect(EntityCache.instance.mention(old_username, domain).username).to eq(old_username)

    change_username

    expect(EntityCache.instance.mention(old_username, domain)).to have_attributes(id: account.id, username: username)
  end

  it 'rejects an incorrect password' do
    expect { described_class.new.call(user, username:, current_password: 'wrong') }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:invalid_password) }
  end

  it 'rejects an invalid username' do
    expect { described_class.new.call(user, username: 'not valid', current_password: password) }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:invalid) }
  end

  it 'rejects a current username owned by another account' do
    other_account = Fabricate(:account)

    expect { described_class.new.call(user, username: other_account.username, current_password: password) }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:reserved) }
  end

  it 'rejects a historical username owned by another account' do
    other_user = Fabricate(:user, password: 'correct-password')
    reserved = other_user.account.username
    described_class.new.call(other_user, username: 'other_new_name', current_password: password)

    expect { described_class.new.call(user, username: reserved, current_password: password) }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:reserved) }
  end

  it 'blocks a third username during cooldown' do
    described_class.new.call(user, username: 'second_name', current_password: password)

    expect { described_class.new.call(user, username: 'third_name', current_password: password) }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:cooldown) }
  end

  it 'allows a new username after 15 days' do
    described_class.new.call(user, username: 'second_name', current_password: password)
    account.username_reservations.historical.update_all(relinquished_at: 15.days.ago)

    expect { described_class.new.call(user, username: 'third_name', current_password: password) }
      .to change(account.reload, :username).to('third_name')
  end

  it 'allows rollback to the immediately previous username during cooldown and retains history' do
    original = account.username
    described_class.new.call(user, username: 'second_name', current_password: password)

    expect { described_class.new.call(user, username: original, current_password: password) }
      .to change(account.reload, :username).to(original)

    expect(account.username_reservations.find_by(username: 'second_name').relinquished_at).to be_present
    expect(account.username_reservations.count).to eq(2)
  end

  it 'requires the password again for rollback' do
    original = account.username
    described_class.new.call(user, username: 'second_name', current_password: password)

    expect { described_class.new.call(user, username: original, current_password: 'wrong') }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:invalid_password) }
  end

  it 'restarts cooldown after rollback' do
    original = account.username
    described_class.new.call(user, username: 'second_name', current_password: password)
    described_class.new.call(user, username: original, current_password: password)

    expect { described_class.new.call(user, username: 'third_name', current_password: password) }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:cooldown) }
  end

  it 'rejects accounts using a username-based Actor ID' do
    account.update_column(:id_scheme, Account.id_schemes[:username_ap_id])

    expect { change_username }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:incompatible_actor_id) }
  end

  it 'rejects remote accounts' do
    account.update_column(:domain, 'remote.example')

    expect { change_username }
      .to raise_error(described_class::Error) { |error| expect(error.code).to eq(:ineligible) }
  end

  it 'allows only one of two accounts racing for the same username', use_transactional_tests: false do
    users = Array.new(2) { Fabricate(:user, password:) }
    results = Concurrent::Array.new
    contended_username = "contended_#{SecureRandom.hex(6)}"

    multi_threaded_execution(2) do |index|
      described_class.new.call(users[index], username: contended_username, current_password: password)
      results << :success
    rescue described_class::Error => e
      results << e.code
    ensure
      ActiveRecord::Base.connection_pool.release_connection
    end

    expect(results).to contain_exactly(:success, :conflict)
    expect(Account.where('lower(username) = ?', contended_username).count).to eq(1)
    expect(AccountUsernameReservation.where('lower(username) = ?', contended_username).count).to eq(1)
  end
end
