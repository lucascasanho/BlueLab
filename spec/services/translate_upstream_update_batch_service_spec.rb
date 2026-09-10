# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TranslateUpstreamUpdateBatchService do
  subject(:result) { described_class.new.call(batch, target_language) }

  let(:batch) { Fabricate(:upstream_update_batch) }
  let(:target_language) { 'pt-BR' }
  let(:backend) { instance_double(TranslationService, languages: { 'en' => ['pt-BR', 'pt'] }) }

  before do
    allow(TranslationService).to receive_messages(configured?: true, configured: backend)
  end

  it 'translates complete commit messages with the configured instance service' do
    translation = TranslationService::Translation.new(text: 'Melhora o compositor', provider: 'LibreTranslate', detected_source_language: 'en')
    allow(backend).to receive(:translate).with(['Improve the composer'], 'en', 'pt-BR').and_return([translation])

    expect(result).to include(
      messages: ['Melhora o compositor'],
      provider: 'LibreTranslate',
      language: 'pt-BR',
      translated: true
    )
  end

  it 'falls back to the original notes when translation is unavailable' do
    allow(backend).to receive(:translate).and_raise(TranslationService::UnexpectedResponseError)

    expect(result).to include(messages: ['Improve the composer'], translated: false)
  end

  it 'preserves failed messages while keeping translations from successful batches' do
    commits = Array.new(11) do |index|
      {
        sha: format('%040x', index + 1),
        message: "Commit #{index + 1}",
        author: 'Mastodon contributor',
      }
    end
    batch.update!(commits: commits)
    first_batch = commits.first(10).pluck(:message)
    translations = first_batch.map { |message| TranslationService::Translation.new(text: "Traduzido: #{message}", provider: 'LibreTranslate') }
    allow(backend).to receive(:translate).with(first_batch, 'en', 'pt-BR').and_return(translations)
    allow(backend).to receive(:translate).with(['Commit 11'], 'en', 'pt-BR').and_raise(TranslationService::UnexpectedResponseError)

    expect(result[:messages]).to eq(translations.map(&:text) + ['Commit 11'])
    expect(result).to include(provider: 'LibreTranslate', translated: true)
  end

  it 'does not translate English notes for an English interface' do
    allow(backend).to receive(:translate)

    english_result = described_class.new.call(batch, 'en')

    expect(english_result).to include(messages: ['Improve the composer'], translated: false)
    expect(backend).to_not have_received(:translate)
  end

  it 'uses the base language when the complete locale is not supported' do
    allow(backend).to receive(:languages).and_return('en' => ['pt'])
    translation = TranslationService::Translation.new(text: 'Melhora o compositor', provider: 'LibreTranslate')
    allow(backend).to receive(:translate).with(['Improve the composer'], 'en', 'pt').and_return([translation])

    expect(result).to include(language: 'pt', translated: true)
    expect(backend).to have_received(:translate).with(['Improve the composer'], 'en', 'pt')
  end
end
