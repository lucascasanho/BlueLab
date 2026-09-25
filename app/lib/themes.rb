# frozen_string_literal: true

class Themes
  include Singleton

  THEME_COLORS = {
    dark: '#181820',
    light: '#ffffff',
  }.freeze

  USER_SELECTABLE_NAMES = %w[blue-2 mastodon-bird-ui-auto mastodon-5].freeze

  def initialize
    @conf = YAML.load_file(Rails.root.join('config', 'themes.yml'))
  end

  def names
    @conf.keys
  end

  def selectable_names
    names & USER_SELECTABLE_NAMES
  end
end
