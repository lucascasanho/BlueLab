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

  # Validated semantic-token overrides. Keeping this after the selected theme
  # lets every theme retain its structure while instance colors stay authoritative.
  def instance_customization_styles
    accent = safe_customization_color(:instance_accent_color, fallback: '#6364ff')
    light_background = safe_customization_color(:instance_light_background_color, fallback: '#ffffff')
    light_surface = safe_customization_color(:instance_light_surface_color, fallback: '#f7f7f9')
    light_text = safe_customization_color(:instance_light_text_color, fallback: '#1f1b23')
    dark_background = safe_customization_color(:instance_dark_background_color, fallback: '#1e2028')
    dark_surface = safe_customization_color(:instance_dark_surface_color, fallback: '#232543')
    dark_text = safe_customization_color(:instance_dark_text_color, fallback: '#f7f9f9')
    custom_logo = Rails.cache.fetch('site_uploads/auth_logo') { SiteUpload.find_by(var: 'auth_logo') }&.file&.url
    custom_logo = nil unless custom_logo&.match?(%r{\A/[a-zA-Z0-9_./-]+\z})
    logo_token = "--instance-logo: url(#{custom_logo});" if custom_logo.present?

    css = <<~CSS
      :root {
        #{logo_token}
        --color-bg-brand-base: #{accent};
        --color-bg-brand-base-hover: color-mix(in srgb, #{accent}, black 15%);
        --color-bg-brand-soft: color-mix(in srgb, #{accent}, transparent 85%);
        --color-bg-brand-softest: color-mix(in srgb, #{accent}, transparent 90%);
      }
      [data-color-scheme=dark], html:not([data-color-scheme]) {
        --color-bg: #{dark_background};
        --color-bg-primary: #{dark_background};
        --color-bg-ambient: #{dark_background};
        --color-bg-elevated: #{dark_surface};
        --color-bg-secondary-base: #{dark_surface};
        --color-bg-secondary: #{dark_surface};
        --color-bg-secondary-solid: #{dark_surface};
        --color-dark: #{dark_surface};
        --color-fg: #{dark_text};
        --color-light-text: #{dark_text};
        --color-text-primary: #{dark_text};
        --color-text-brand: color-mix(in srgb, #{accent}, white 20%);
        --color-text-brand-soft: var(--color-text-brand);
        --color-text-status-links: var(--color-text-brand);
        --color-border-brand: var(--color-text-brand);
      }
      [data-color-scheme=light] {
        --color-bg: #{light_background};
        --color-bg-primary: #{light_background};
        --color-bg-ambient: #{light_background};
        --color-bg-elevated: #{light_surface};
        --color-bg-secondary-base: #{light_surface};
        --color-bg-secondary: #{light_surface};
        --color-bg-secondary-solid: #{light_surface};
        --color-dark: #{light_surface};
        --color-fg: #{light_text};
        --color-light-text: #{light_text};
        --color-text-primary: #{light_text};
        --color-text-brand: color-mix(in srgb, #{accent}, black 20%);
        --color-text-brand-soft: var(--color-text-brand);
        --color-text-status-links: var(--color-text-brand);
        --color-border-brand: var(--color-text-brand);
      }

      /* BlueLab owns a second semantic layer (--blue2-*). Mirror the instance
         palette into that layer at runtime so compiled theme defaults cannot
         mask administrator-selected colors. This is intentionally theme-gated. */
      body[data-theme='blue-2'] {
        --blue2-blue: #{accent};
        --blue2-blue-hover: color-mix(in srgb, #{accent}, black 15%);
        --color-bg-brand-soft: color-mix(in srgb, #{accent} 14%, transparent);
        --color-bg-brand-softest: color-mix(in srgb, #{accent} 8%, transparent);
      }
      body[data-theme='blue-2'] ::selection {
        background: color-mix(in srgb, #{accent}, transparent 65%);
      }
      body[data-theme='blue-2'] .status:hover,
      body[data-theme='blue-2'] .notification:hover,
      body[data-theme='blue-2'] .notification-group:hover {
        background: var(--blue2-hover);
      }
      html[data-color-scheme='dark'] body[data-theme='blue-2'],
      html[data-color-scheme='auto'] body[data-theme='blue-2'],
      html:not([data-color-scheme]) body[data-theme='blue-2'] {
        --blue2-bg: #{dark_background};
        --blue2-surface: #{dark_surface};
        --blue2-surface-raised: #{dark_surface};
        --blue2-search: color-mix(in srgb, #{dark_surface} 92%, #{dark_text});
        --blue2-hover: color-mix(in srgb, #{dark_surface} 96%, #{dark_text});
        --blue2-border: color-mix(in srgb, #{dark_surface} 84%, #{dark_text});
        --blue2-border-soft: color-mix(in srgb, #{dark_surface} 90%, #{dark_text});
        --blue2-text: #{dark_text};
        --blue2-muted: color-mix(in srgb, #{dark_text} 66%, #{dark_background});
        --blue2-muted-2: color-mix(in srgb, #{dark_text} 50%, #{dark_background});
      }
      html[data-color-scheme='light'] body[data-theme='blue-2'] {
        --blue2-bg: #{light_background};
        --blue2-surface: #{light_surface};
        --blue2-surface-raised: #{light_surface};
        --blue2-search: color-mix(in srgb, #{light_surface} 94%, #{light_text});
        --blue2-hover: color-mix(in srgb, #{light_surface} 97%, #{light_text});
        --blue2-border: color-mix(in srgb, #{light_surface} 84%, #{light_text});
        --blue2-border-soft: color-mix(in srgb, #{light_surface} 90%, #{light_text});
        --blue2-text: #{light_text};
        --blue2-muted: color-mix(in srgb, #{light_text} 66%, #{light_background});
        --blue2-muted-2: color-mix(in srgb, #{light_text} 50%, #{light_background});
      }
      @media (prefers-color-scheme: light) {
        html[data-color-scheme='auto'] body[data-theme='blue-2'],
        html:not([data-color-scheme]) body[data-theme='blue-2'] {
          --blue2-bg: #{light_background};
          --blue2-surface: #{light_surface};
          --blue2-surface-raised: #{light_surface};
          --blue2-search: color-mix(in srgb, #{light_surface} 94%, #{light_text});
          --blue2-hover: color-mix(in srgb, #{light_surface} 97%, #{light_text});
          --blue2-border: color-mix(in srgb, #{light_surface} 84%, #{light_text});
          --blue2-border-soft: color-mix(in srgb, #{light_surface} 90%, #{light_text});
          --blue2-text: #{light_text};
          --blue2-muted: color-mix(in srgb, #{light_text} 66%, #{light_background});
          --blue2-muted-2: color-mix(in srgb, #{light_text} 50%, #{light_background});
        }
      }
    CSS
    tag.style(safe_join([css]), nonce: request.content_security_policy_nonce)
  end

  # Theme selection is instance-wide. Per-user theme values are deliberately
  # ignored so accounts with an older saved preference always follow the theme
  # selected by an administrator. Keep BlueLab as the safe fallback if the
  # configured global theme is missing or no longer available.
  def current_theme
    available_themes = Themes.instance.names
    site_theme = Setting.theme

    return site_theme if available_themes.include?(site_theme)
    return 'blue-2' if available_themes.include?('blue-2')

    'default'
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
