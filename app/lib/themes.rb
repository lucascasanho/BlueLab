# frozen_string_literal: true

class Themes
  include Singleton

  THEME_COLORS = {
    dark: '#181820',
    light: '#ffffff',
  }.freeze

  USER_SELECTABLE_NAMES = %w(default blue-2 mastodon-bird-ui-auto).freeze

  def initialize
    @conf = YAML.load_file(Rails.root.join('config', 'themes.yml'))
  end

  def names
    @conf.keys
  end

  # Theme files stay installed even when they are hidden from users. Set
  # selectable: true in config/themes.yml to re-enable an alternative theme.
  def selectable_names
    names.select do |name|
      USER_SELECTABLE_NAMES.include?(name) && @conf.dig(name, 'selectable') != false
    end
  end

  def available_theme_colors(theme)
    return [] unless @conf[theme].is_a?(Hash) && @conf[theme]['colors'].present?

    @conf[theme]['colors']
  end
end
