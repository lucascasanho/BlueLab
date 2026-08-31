# frozen_string_literal: true

class Scheduler::ResumableMediaUploadsCleanupScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0, lock: :until_executed, lock_ttl: 2.hours.to_i

  def perform
    Vacuum::ResumableMediaUploadsVacuum.new.perform
  end
end
