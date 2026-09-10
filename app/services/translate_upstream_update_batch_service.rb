# frozen_string_literal: true

class TranslateUpstreamUpdateBatchService < BaseService
  CACHE_TTL = 30.days.freeze
  SOURCE_LANGUAGE = 'en'
  TRANSLATION_BATCH_SIZE = 10

  def call(batch, target_language)
    @batch = batch
    @messages = batch.commits.pluck('message')
    @target_language = normalize_target_language(target_language)

    return original_result if @messages.empty? || @target_language.blank? || @target_language.start_with?('en')

    Rails.cache.fetch(cache_key, expires_in: CACHE_TTL, race_condition_ttl: 1.hour) do
      translate_messages
    end
  rescue TranslationService::Error, *Mastodon::HTTP_CONNECTION_ERRORS, Mastodon::HostValidationError, Mastodon::LengthValidationError, JSON::ParserError => e
    Rails.logger.warn("Official Mastodon commit translation failed: #{e.class}: #{e.message}")
    original_result
  end

  private

  def normalize_target_language(target_language)
    return unless TranslationService.configured?

    available_targets = languages[SOURCE_LANGUAGE] || []
    normalized = target_language.to_s.tr('_', '-')
    available_targets.include?(normalized) ? normalized : available_targets.find { |language| language.split('-').first == normalized.split('-').first }
  end

  def languages
    Rails.cache.fetch('translation_service/languages', expires_in: 7.days, race_condition_ttl: 1.hour) { translation_backend.languages }
  end

  def translation_backend
    @translation_backend ||= TranslationService.configured
  end

  def translate_messages
    translated_messages = []
    provider = nil

    @messages.each_slice(TRANSLATION_BATCH_SIZE) do |message_batch|
      translations = translation_backend.translate(message_batch, SOURCE_LANGUAGE, @target_language)
      raise TranslationService::UnexpectedResponseError unless translations.size == message_batch.size

      translated_messages.concat(translations.each_with_index.map { |translation, index| translation.text.presence || message_batch[index] })
      provider ||= translations.first&.provider
    rescue TranslationService::Error, *Mastodon::HTTP_CONNECTION_ERRORS, Mastodon::HostValidationError, Mastodon::LengthValidationError, JSON::ParserError => e
      Rails.logger.warn("Official Mastodon commit translation batch failed: #{e.class}: #{e.message}")
      translated_messages.concat(message_batch)
    end

    return original_result if provider.blank?

    {
      messages: translated_messages,
      provider: provider,
      language: @target_language,
      translated: true,
    }
  end

  def cache_key
    digest = Digest::SHA256.hexdigest(@messages.to_json)
    "official_mastodon_commit_translations/v1/#{@target_language}/#{@batch.head_sha}/#{digest}"
  end

  def original_result
    {
      messages: @messages,
      provider: nil,
      language: nil,
      translated: false,
    }
  end
end
