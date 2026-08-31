# frozen_string_literal: true

module ResumableMediaUploads
  class Error < StandardError
    attr_reader :code

    def initialize(code, message = nil)
      @code = code
      super(message || code.humanize)
    end
  end

  class BadRequestError < Error; end
  class ConflictError < Error; end
  class ChecksumMismatchError < Error; end
  class IncompleteError < Error; end
  class ResourceLimitError < Error; end
  class PermanentError < Error; end
end
