# frozen_string_literal: true

class VerificationRequestPolicy < ApplicationPolicy
  def index?
    role.can?(:manage_roles)
  end

  def show?
    role.can?(:manage_roles)
  end

  def resolve?
    role.can?(:manage_roles)
  end
end
