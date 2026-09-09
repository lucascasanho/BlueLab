# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PublishScheduledThreadWorker do
  let(:account) { Fabricate(:user).account }
  let(:thread) { Fabricate(:scheduled_thread, account:) }

  before do
    Fabricate(:scheduled_status, account:, scheduled_thread: thread, thread_position: 0, params: { text: 'First', visibility: 'public', language: 'pt' })
    Fabricate(:scheduled_status, account:, scheduled_thread: thread, thread_position: 1, params: { text: 'Second', visibility: 'public', language: 'pt' })
    Fabricate(:scheduled_status, account:, scheduled_thread: thread, thread_position: 2, params: { text: 'Third', visibility: 'public', language: 'pt' })
    thread.update_column(:scheduled_at, 1.minute.ago)
    thread.scheduled_statuses.update_all(scheduled_at: 1.minute.ago)
  end

  it 'publishes sequentially with each post replying to the previous real ID' do
    described_class.new.perform(thread.id)

    first = account.statuses.find_by!(text: 'First')
    second = account.statuses.find_by!(text: 'Second')
    third = account.statuses.find_by!(text: 'Third')
    expect(account.statuses.count).to eq(3)
    expect(second.thread).to eq(first)
    expect(third.thread).to eq(second)
    expect(ScheduledThread.exists?(thread.id)).to be false
  end

  it 'checkpoints a partial failure and retries without duplicating published posts' do
    thread.scheduled_statuses.second.update_column(:params, { text: 'Invalid', content_type: 'text/html' })

    expect { described_class.new.perform(thread.id) }.to raise_error(ActiveRecord::RecordInvalid)

    expect(account.statuses.pluck(:text)).to eq(['First'])
    expect(thread.reload).to have_attributes(state: 'failed', attempts: 1)
    expect(thread.scheduled_statuses.first.published_status_id).to eq(account.statuses.first.id)

    thread.scheduled_statuses.second.update_column(:params, { text: 'Second', content_type: 'text/plain' })
    thread.update_columns(next_retry_at: nil, state: 'pending')
    described_class.new.perform(thread.id)

    first = account.statuses.find_by!(text: 'First')
    second = account.statuses.find_by!(text: 'Second')
    third = account.statuses.find_by!(text: 'Third')
    expect(account.statuses.count).to eq(3)
    expect(second.thread).to eq(first)
    expect(third.thread).to eq(second)
  end
end
