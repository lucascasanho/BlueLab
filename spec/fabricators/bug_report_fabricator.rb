# frozen_string_literal: true

Fabricator(:bug_report) do
  account { Fabricate(:account) }
  description { 'The interface did not behave as expected.' }
  client_errors { [] }
end
