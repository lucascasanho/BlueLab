# frozen_string_literal: true

Fabricator(:scheduled_thread) do
  account { Fabricate.build(:account) }
  scheduled_at { 20.hours.from_now }
end
