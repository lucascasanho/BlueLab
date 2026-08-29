# frozen_string_literal: true

class StatusLengthValidator < ActiveModel::Validator
  MAX_CHARS = 500
  PRIVILEGED_MAX_CHARS = 10_000
  URL_PLACEHOLDER_CHARS = 23
  URL_PLACEHOLDER = 'x' * 23

  def self.max_chars_for(account)
    role = account&.user&.role
    role&.administrator? ? admin_max_chars : max_chars
  end

  def self.max_chars
    Setting.status_character_limit.to_i.clamp(1, 100_000)
  end

  def self.admin_max_chars
    Setting.admin_status_character_limit.to_i.clamp(max_chars, 100_000)
  end

  def validate(status)
    return unless status.local? && !status.reblog?

    max_chars = self.class.max_chars_for(status.account)
    status.errors.add(:text, I18n.t('statuses.over_character_limit', max: max_chars)) if too_long?(status, max_chars)
  end

  private

  def too_long?(status, max_chars)
    countable_length(combined_text(status)) > max_chars
  end

  def countable_length(str)
    str.each_grapheme_cluster.size
  end

  def combined_text(status)
    [status.spoiler_text, countable_text(status.text)].join
  end

  def countable_text(str)
    return '' if str.blank?

    # To ensure that we only give length concessions to entities that
    # will be correctly parsed during formatting, we go through full
    # entity extraction

    entities = Extractor.remove_overlapping_entities(Extractor.extract_urls_with_indices(str, extract_url_without_protocol: false) + Extractor.extract_mentions_or_lists_with_indices(str))

    rewrite_entities(str, entities) do |entity|
      if entity[:url]
        URL_PLACEHOLDER
      elsif entity[:screen_name]
        "@#{entity[:screen_name].split('@').first}"
      end
    end
  end

  def rewrite_entities(str, entities)
    entities.sort_by! { |entity| entity[:indices].first }
    result = +''

    last_index = entities.reduce(0) do |index, entity|
      result << str[index...entity[:indices].first]
      result << yield(entity)
      entity[:indices].last
    end

    result << str[last_index..]
    result
  end
end
