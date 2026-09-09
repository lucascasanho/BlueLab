# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Scheduler::ScheduledStatusesScheduler do
  let(:worker) { described_class.new }

  describe 'perform' do
    it 'runs without error' do
      expect { worker.perform }.to_not raise_error
    end

    it 'queues a scheduled thread as one coordinator job and excludes its children from native jobs' do
      thread = Fabricate(:scheduled_thread)
      thread.update_column(:scheduled_at, 1.minute.from_now)
      child = Fabricate(
        :scheduled_status,
        account: thread.account,
        scheduled_thread: thread,
        thread_position: 0
      )
      child.update_column(:scheduled_at, thread.scheduled_at)

      expect { worker.perform }.to change(PublishScheduledThreadWorker.jobs, :size).by(1)
      expect(PublishScheduledThreadWorker.jobs.last['args']).to eq([thread.id])
      expect(PublishScheduledStatusWorker.jobs.pluck('args')).to_not include([child.id])
    end
  end
end
