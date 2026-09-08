# frozen_string_literal: true

class RemoteInstanceVerificationWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'pull', retry: 3, dead: false, lock: :until_executed, lock_ttl: 1.day.to_i

  def perform(account_id)
    account = Account.remote.find_by(id: account_id)
    return if account.nil?

    FetchRemoteInstanceVerificationService.new.call(account)
  end
end
