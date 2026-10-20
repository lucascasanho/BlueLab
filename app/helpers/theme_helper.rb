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

  def available_theme_colors(theme)
    Themes.instance.available_theme_colors(theme)
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

  # Keep instance palette overrides on the alternative themes only. The default
  # Vanilla theme must use Mastodon's own token and color-palette system.
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
    custom_logo ||= favicon_path(48) || frontend_asset_path('icons/favicon-48x48.png')
    logo_token = "--instance-logo: url(#{custom_logo});" if custom_logo.present?

    # This CSS is passed through safe_join before it is placed in a <style> RAWTEXT
    # element. HTML-escaped quotes are not decoded inside <style>, so quoted
    # attribute selectors would reach the CSS parser as &#39; and become invalid.
    # All attribute values below are valid CSS identifiers and therefore stay
    # intentionally unquoted.
    css = <<~CSS
      :root {
        #{logo_token}
      }
      html:has(body[data-theme=blue-2]),
      html:has(body[data-theme=mastodon-bird-ui-auto]) {
        --color-bg-brand-base: #{accent};
        --color-bg-brand-base-hover: color-mix(in srgb, #{accent}, black 15%);
        /* Legacy semantic aliases are scoped to the two alternative themes. */
        --color-brand-mastodon: #{accent};
        --color-brand-mastodon-links: #{accent};
        --color-accent: #{accent};
        --color-accent-dark: #{accent};
        --color-accent-dark-50: color-mix(in srgb, #{accent}, transparent 50%);
        --color-hashtag: #{accent};
        --color-mention: #{accent};
        --color-link: #{accent};
        --color-bg-brand-soft: color-mix(in srgb, #{accent}, transparent 85%);
        --color-bg-brand-softest: color-mix(in srgb, #{accent}, transparent 90%);
      }
      html[data-color-scheme=dark]:has(body[data-theme=blue-2]),
      html:not([data-color-scheme]):has(body[data-theme=blue-2]),
      html[data-color-scheme=dark]:has(body[data-theme=mastodon-bird-ui-auto]),
      html:not([data-color-scheme]):has(body[data-theme=mastodon-bird-ui-auto]) {
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
      html[data-color-scheme=light]:has(body[data-theme=blue-2]),
      html[data-color-scheme=light]:has(body[data-theme=mastodon-bird-ui-auto]) {
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
      body[data-theme=blue-2] {
        --blue2-blue: #{accent};
        --blue2-blue-hover: color-mix(in srgb, #{accent}, black 15%);
        --color-bg-brand-soft: color-mix(in srgb, #{accent} 14%, transparent);
        --color-bg-brand-softest: color-mix(in srgb, #{accent} 8%, transparent);
      }
      body[data-theme=blue-2] ::selection {
        background: color-mix(in srgb, #{accent}, transparent 65%);
      }
      body[data-theme=blue-2] .status:hover,
      body[data-theme=blue-2] .notification:hover,
      body[data-theme=blue-2] .notification-group:hover {
        background: var(--blue2-hover);
      }
      html[data-color-scheme=dark] body[data-theme=blue-2],
      html[data-color-scheme=auto] body[data-theme=blue-2],
      html:not([data-color-scheme]) body[data-theme=blue-2] {
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
      html[data-color-scheme=light] body[data-theme=blue-2] {
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
        html[data-color-scheme=auto] body[data-theme=blue-2],
        html:not([data-color-scheme]) body[data-theme=blue-2] {
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

  # Users may choose one of the small set of themes exposed by BlueLab.
  # The BlueLab preference is stored separately from the instance-wide Mastodon theme.
  def current_theme
    available_themes = Themes.instance.selectable_names
    user_theme = current_user_if_available&.setting_bluelab_theme
    site_theme = Setting.theme

    return user_theme if available_themes.include?(user_theme)
    return site_theme if available_themes.include?(site_theme)

    available_themes.first || 'default'
  end

  def color_scheme
    current_user_if_available&.setting_color_scheme || 'auto'
  end

  def contrast
    current_user_if_available&.setting_contrast || 'auto'
  end

  def density
    current_user&.setting_density || 'default'
  end

  def theme_color(theme)
    available_colors = available_theme_colors(theme)
    return if available_colors.empty?

    user_color = current_user&.setting_theme_color
    return user_color if user_color && available_colors.include?(user_color)

    color = Setting.theme_color
    return color if color && available_colors.include?(color)

    available_colors.first
  end

  def page_color_scheme
    content_for(:force_color_scheme).presence || color_scheme
  end

  def page_theme_color(theme)
    content_for(:force_theme_color).presence || theme_color(theme)
  end

  private

  def current_user_if_available
    return unless request.respond_to?(:env) && request.env['warden']

    current_user
  rescue Devise::MissingWarden
    nil
  end

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
