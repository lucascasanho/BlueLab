# frozen_string_literal: true

module ThemeHelper
  def javascript_inline_tag(path)
    entry = InlineScriptManager.instance.file(path)

    # Only add hash if we don't allow arbitrary includes already, otherwise it's going
    # to break the React Tools browser extension or other inline scripts
    unless Rails.env.development? && request.content_security_policy.dup.script_src.include?("'unsafe-inline'")
      request.content_security_policy = request.content_security_policy.clone.tap do |policy|
        values = policy.script_src
        values << "'sha256-#{entry[:digest]}'"
        policy.script_src(*values)
      end
    end

    content_tag(:script, entry[:contents], type: 'text/javascript')
  end

  def theme_style_tags(theme)
    vite_stylesheet_tag "themes/#{theme}", type: :virtual, media: 'all', crossorigin: 'anonymous'
  end

  def theme_color_tags(color_scheme)
    case color_scheme
    when 'auto'
      ''.html_safe.tap do |tags|
        tags << tag.meta(name: 'theme-color', content: Themes::THEME_COLORS[:dark], media: '(prefers-color-scheme: dark)')
        tags << tag.meta(name: 'theme-color', content: Themes::THEME_COLORS[:light], media: '(prefers-color-scheme: light)')
      end
    when 'light'
      tag.meta name: 'theme-color', content: Themes::THEME_COLORS[:light]
    when 'dark'
      tag.meta name: 'theme-color', content: Themes::THEME_COLORS[:dark]
    end
  end

  def custom_stylesheet
    return if active_custom_stylesheet.blank?

    stylesheet_link_tag(
      custom_css_path(active_custom_stylesheet),
      host: root_url,
      media: :all,
      skip_pipeline: true
    )
  end

  # Validated semantic-token overrides for Espelunca. Keeping this after the
  # selected theme lets every theme retain its neutral palette.
  def instance_customization_styles
    accent = safe_customization_color(:instance_accent_color, fallback: '#6364ff')

    css = <<~CSS
      :root {
        --color-bg-brand-base: #{accent};
        --color-bg-brand-base-hover: color-mix(in srgb, #{accent}, black 15%);
        --color-bg-brand-soft: color-mix(in srgb, #{accent}, transparent 85%);
        --color-bg-brand-softest: color-mix(in srgb, #{accent}, transparent 90%);
      }
      [data-color-scheme='dark'], html:not([data-color-scheme]) {
        --color-text-brand: color-mix(in srgb, #{accent}, white 20%);
        --color-text-brand-soft: var(--color-text-brand);
        --color-text-status-links: var(--color-text-brand);
        --color-border-brand: var(--color-text-brand);
      }
      [data-color-scheme='light'] {
        --color-text-brand: color-mix(in srgb, #{accent}, black 20%);
        --color-text-brand-soft: var(--color-text-brand);
        --color-text-status-links: var(--color-text-brand);
        --color-border-brand: var(--color-text-brand);
      }
    CSS
    tag.style(safe_join([css]), nonce: request.content_security_policy_nonce)
  end

  def current_theme
    available_themes = Themes.instance.names

    user_theme = current_user&.setting_theme
    return user_theme if user_theme && available_themes.include?(user_theme)

    site_theme = Setting.theme
    return site_theme if available_themes.include?(site_theme)

    'default' # Fallback
  end

  def color_scheme
    current_user&.setting_color_scheme || 'auto'
  end

  def contrast
    current_user&.setting_contrast || 'auto'
  end

  def page_color_scheme
    content_for(:force_color_scheme).presence || color_scheme
  end

  private

  def active_custom_stylesheet
    return if cached_custom_css_digest.blank?

    [:custom, cached_custom_css_digest.to_s.first(8)]
      .compact_blank
      .join('-')
  end

  def cached_custom_css_digest
    Rails.cache.fetch(:setting_digest_custom_css) do
      Setting.custom_css&.then { |content| Digest::SHA256.hexdigest(content) }
    end
  end
end
