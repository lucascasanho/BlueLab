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
  THREADS_BADGE_COLOR = '#0095f6'
  THREADS_BADGE_VIEW_BOX = '0 0 24 24'
  THREADS_BADGE_PATH = [
    'M21.8836 11.9999',
    'L23.3416 9.72645',
    'C23.4939 9.48915 23.5389 9.19911 23.4656 8.92762',
    'C23.3934 8.65614 23.2088 8.42762 22.9588 8.29774',
    'L20.5594 7.05751',
    'L20.6854 4.36024',
    'C20.6981 4.07899 20.5926 3.80555 20.3934 3.60633',
    'C20.1941 3.40613 19.9148 3.2909 19.6395 3.31434',
    'L16.9417 3.44032',
    'L15.7015 1.04091',
    'C15.5726 0.790906 15.3441 0.606336 15.0721 0.534066',
    'C14.7996 0.461796 14.5106 0.505746 14.2737 0.658086',
    'L11.9999 2.1161',
    'L9.72594 0.658096',
    'C9.48912 0.505756 9.19811 0.461806 8.9276 0.534076',
    'C8.65563 0.606346 8.42711 0.790916 8.29821 1.04092',
    'L7.05798 3.44033',
    'L4.35974 3.31435',
    'C4.08093 3.29287 3.80554 3.40615 3.60632 3.60634',
    'C3.4071 3.80556 3.30114 4.079 3.31433 4.36025',
    'L3.43982 7.05752',
    'L1.04041 8.29775',
    'C0.790409 8.42763 0.606819 8.65615 0.534059 8.92763',
    'C0.461299 9.19911 0.506229 9.48915 0.658079 9.72646',
    'L2.1156 11.9999',
    'L0.658069 14.2733',
    'C0.506209 14.5106 0.461289 14.8007 0.534049 15.0722',
    'C0.606809 15.3436 0.790399 15.5722 1.0404 15.702',
    'L3.43981 16.9423',
    'L3.31432 19.6395',
    'C3.30114 19.9208 3.40709 20.1942 3.60631 20.3934',
    'C3.80553 20.5936 4.07945 20.703 4.35973 20.6854',
    'L7.05797 20.5595',
    'L8.2982 22.9589',
    'C8.42711 23.2089 8.65562 23.3934 8.92759 23.4657',
    'C9.1981 23.536 9.48911 23.494 9.72593 23.3417',
    'L11.9999 21.8837',
    'L14.2737 23.3417',
    'C14.4363 23.4462 14.6238 23.4999 14.8133 23.4999',
    'C14.8997 23.4999 14.9871 23.4882 15.0721 23.4657',
    'C15.344 23.3934 15.5725 23.2089 15.7014 22.9589',
    'L16.9417 20.5595',
    'L19.6394 20.6854',
    'C19.9168 20.705 20.1951 20.5936 20.3933 20.3934',
    'C20.5926 20.1942 20.698 19.9208 20.6853 19.6395',
    'L20.5593 16.9423',
    'L22.9588 15.702',
    'C23.2088 15.5722 23.3933 15.3436 23.4656 15.0722',
    'C23.5388 14.8007 23.4939 14.5106 23.3416 14.2733',
    'L21.8836 11.9999',
    'Z',
    'M17.207 9.70705',
    'L11.207 15.707',
    'C11.0117 15.9024 10.7558 16 10.5 16',
    'C10.2441 16 9.98827 15.9024 9.79296 15.707',
    'L6.79296 12.707',
    'C6.40234 12.3164 6.40234 11.6836 6.79296 11.293',
    'C7.18358 10.9024 7.8164 10.9024 8.20702 11.293',
    'L10.5 13.586',
    'L15.793 8.29299',
    'C16.1836 7.90237 16.8164 7.90237 17.207 8.29299',
    'C17.5976 8.68361 17.5976 9.31643 17.207 9.70705',
    'Z',
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

  def threads_badge
    {
      'view_box' => THREADS_BADGE_VIEW_BOX,
      'path' => THREADS_BADGE_PATH,
      'colors' => [THREADS_BADGE_COLOR],
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
