# frozen_string_literal: true

module BrandingHelper
  def logo_as_symbol(version = :icon)
    case version
    when :icon
      _logo_as_symbol_icon
    when :wordmark
      _logo_as_symbol_wordmark
    end
  end

  def _logo_as_symbol_wordmark
    tag.span(class: 'instance-wordmark-brand') do
      image_tag(instance_brand_logo_url, alt: '') + tag.span(Setting.site_title)
    end
  end

  def _logo_as_symbol_icon
    image_tag(instance_brand_logo_url, alt: Setting.site_title, class: 'logo logo--icon')
  end

  def render_logo
    image_tag(instance_brand_logo_url, alt: Setting.site_title, class: 'logo logo--icon')
  end

  def instance_brand_logo_url
    instance_presenter.auth_logo&.file&.url.presence ||
      favicon_path(48) ||
      frontend_asset_path('icons/favicon-48x48.png')
  end
end
