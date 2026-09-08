# frozen_string_literal: true

module InstanceVerification
  NAMESPACE = 'https://mastodon.blue/ns#'
  FALLBACK_COLOR = '#1d9bf0'
  BADGE_VIEW_BOX = '0 0 24 24'
  BADGE_PATH = [
    'M22.51,13.76a3,3,0,0,1,0-3.52l.76-1.05a1,1,0,0,0,.14-.9,1.018,1.018,0,0,0-.64-.64l-1.23-.4A2.987,2.987,0,0,1,19.47,4.4V3.1a1,1,0,0,0-1.31-.95l-1.24.4a3,3,0,0,1-3.35-1.09L12.81.41a1',
    '.036,1.036,0,0,0-1.62,0l-.76,1.05A3,3,0,0,1,7.08,2.55l-1.24-.4a1,1,0,0,0-1.31.95V4.4A2.987,2.987,0,0,1,2.46,7.25l-1.23.4a1.018,1.018,0,0,0-.64.64,1,1,0,0,0,.14.9l.76,1.05a3,3,0,0,1',
    ',0,3.52L.73,14.81a1,1,0,0,0-.14.9,1.018,1.018,0,0,0,.64.64l1.23.4A2.987,2.987,0,0,1,4.53,19.6v1.3a1,1,0,0,0,1.31.95l1.23-.4a2.994,2.994,0,0,1,3.36,1.09l.76,1.05a1.005,1.005,0,0,0,1',
    '.62,0l.76-1.05a3,3,0,0,1,3.36-1.09l1.23.4a1,1,0,0,0,1.31-.95V19.6a2.987,2.987,0,0,1,2.07-2.85l1.23-.4a1.018,1.018,0,0,0,.64-.64,1,1,0,0,0-.14-.9Zm-5.8-3.053-5,5a1,1,0,0,1-1.414,0l-',
    '3-3a1,1,0,1,1,1.414-1.414L11,13.586l4.293-4.293a1,1,0,0,1,1.414,1.414Z',
  ].join.freeze

  COLOR_PATTERN = /\A#[0-9a-fA-F]{6}\z/
  PATH_PATTERN = /\A[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\-\s]+\z/
  MAX_ISSUER_NAME_LENGTH = 100
  MAX_PATH_LENGTH = 8.kilobytes
  MAX_VIEW_BOX_ABSOLUTE_VALUE = 100_000

  module_function

  def local_badge
    accent = normalized_color(Setting.instance_accent_color) || FALLBACK_COLOR

    {
      'view_box' => BADGE_VIEW_BOX,
      'path' => BADGE_PATH,
      'colors' => [mix(accent, '#ffffff', 0.2), accent.downcase, mix(accent, '#000000', 0.2)],
    }
  end

  def normalize_badge(value)
    return unless value.is_a?(Hash)
    return if value['mediaType'].present? && value['mediaType'] != 'image/svg+xml'

    view_box = normalize_view_box(value['viewBox'] || value['view_box'] || value["#{NAMESPACE}viewBox"])
    path = value['svgPath'] || value['path'] || value["#{NAMESPACE}svgPath"]
    colors = Array(value['colors'] || value["#{NAMESPACE}colors"]).filter_map { |color| normalized_color(color) }.take(3)

    return if view_box.nil? || !valid_path?(path) || colors.empty?

    {
      'view_box' => view_box,
      'path' => path,
      'colors' => colors,
    }
  end

  def normalize_issuer_name(value, fallback:)
    value = value.to_s.squish
    value = fallback if value.blank?
    value[0...MAX_ISSUER_NAME_LENGTH]
  end

  def normalize_verified_at(value)
    return if value.blank?

    Time.iso8601(value.to_s).utc.iso8601(3)
  rescue ArgumentError
    nil
  end

  def activitypub_badge
    local_badge.then do |badge|
      {
        type: 'Image',
        media_type: 'image/svg+xml',
        view_box: badge['view_box'],
        svg_path: badge['path'],
        colors: badge['colors'],
      }
    end
  end

  def normalized_color(value)
    value.to_s.match?(COLOR_PATTERN) ? value.to_s.downcase : nil
  end

  def normalize_view_box(value)
    parts = value.to_s.split
    return unless parts.size == 4

    numbers = parts.map { |part| Float(part) }
    return unless numbers.all?(&:finite?)
    return unless numbers.all? { |number| number.abs <= MAX_VIEW_BOX_ABSOLUTE_VALUE }
    return unless numbers[2].positive? && numbers[3].positive?

    parts.join(' ')
  rescue ArgumentError
    nil
  end

  def valid_path?(value)
    value.is_a?(String) && value.bytesize <= MAX_PATH_LENGTH && value.match?(PATH_PATTERN)
  end

  def mix(first, second, second_weight)
    first_channels = first.delete_prefix('#').scan(/../).map { |part| part.to_i(16) }
    second_channels = second.delete_prefix('#').scan(/../).map { |part| part.to_i(16) }
    mixed = first_channels.zip(second_channels).map do |first_channel, second_channel|
      ((first_channel * (1 - second_weight)) + (second_channel * second_weight)).round
    end

    format('#%<red>02x%<green>02x%<blue>02x', red: mixed[0], green: mixed[1], blue: mixed[2])
  end
  private_class_method :mix, :normalize_view_box, :valid_path?
end
