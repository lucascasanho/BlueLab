# frozen_string_literal: true

module Auth::RegistrationSpamConcern
  extend ActiveSupport::Concern

  def set_registration_form_time
    session[:registration_form_time] = Time.now.utc
    @registration_intent_token = RegistrationProtection.issue_intent(session)
  end

  def consume_registration_intent
    valid = RegistrationProtection.consume_intent(session, params[:registration_intent])
    @registration_intent_token = RegistrationProtection.issue_intent(session)
    valid
  end
end
