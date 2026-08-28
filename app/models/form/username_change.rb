# frozen_string_literal: true

class Form::UsernameChange
  include ActiveModel::Model

  attr_accessor :username, :current_password, :confirmation

  validates :username, :current_password, presence: true
  validates :confirmation, acceptance: true
end
