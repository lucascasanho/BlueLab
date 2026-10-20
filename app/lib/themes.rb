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

  def selectable_names
    names & USER_SELECTABLE_NAMES
  end

  def available_theme_colors(theme)
    return [] unless @conf[theme].is_a?(Hash) && @conf[theme]['colors'].present?

    @conf[theme]['colors']
  end
end
