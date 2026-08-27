# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AdvancedTextFormatter do
  subject(:formatted) { described_class.new(text, content_type: 'text/markdown', preloaded_accounts: []).to_s }

  context 'with supported Markdown' do
    let(:text) { "**negrito** e *italico*\n\n- um\n- dois\n\n`codigo`" }

    it 'renders formatting and lists' do
      expect(formatted).to include('<strong>negrito</strong>', '<em>italico</em>', '<ul>', '<code>codigo</code>')
    end
  end

  context 'with a hashtag and URL' do
    let(:text) { '#Espelunca https://espelunca.social' }

    it 'preserves Mastodon linkification' do
      expect(formatted).to include('class="mention hashtag"', 'href="https://espelunca.social"')
    end
  end

  context 'with raw HTML' do
    let(:text) { '<script>alert("xss")</script><strong>nao permitido</strong>' }

    it 'escapes raw tags' do
      expect(formatted).to include('&lt;script&gt;', '&lt;strong&gt;')
      expect(formatted).to_not include('<script>', '<strong>nao permitido</strong>')
    end
  end

  context 'with a Markdown image' do
    let(:text) { '![rastreador](https://example.com/tracker.png)' }

    it 'does not render an image' do
      expect(formatted).to_not include('<img')
    end
  end
end
