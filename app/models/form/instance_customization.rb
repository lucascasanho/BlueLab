# frozen_string_literal: true

# Instance customization settings intentionally live in one form object to
# minimize the surface touched during upstream merges.
class Form::InstanceCustomization
  include ActiveModel::Model

  SCALAR_KEYS = %i(
    status_character_limit
    admin_status_character_limit
    hide_status_character_counter
    hide_admin_status_character_counter
    media_image_size_limit_mb
    media_video_size_limit_mb
    instance_accent_color
    instance_light_background_color
    instance_light_surface_color
    instance_light_text_color
    instance_dark_background_color
    instance_dark_surface_color
    instance_dark_text_color
  ).freeze
  UPLOAD_KEYS = %i(auth_logo email_logo).freeze
  KEYS = (SCALAR_KEYS + UPLOAD_KEYS).freeze
  INTEGER_KEYS = %i(status_character_limit admin_status_character_limit media_image_size_limit_mb media_video_size_limit_mb).freeze
  BOOLEAN_KEYS = %i(hide_status_character_counter hide_admin_status_character_counter).freeze
  COLOR_KEYS = %i(
    instance_accent_color
    instance_light_background_color
    instance_light_surface_color
    instance_light_text_color
    instance_dark_background_color
    instance_dark_surface_color
    instance_dark_text_color
  ).freeze

  STATUS_LIMIT_RANGE = (1..100_000)
  IMAGE_LIMIT_RANGE = (1..100)
  VIDEO_LIMIT_RANGE = (1..1024)
  UPLOAD_MIME_TYPES = %w(image/png image/jpeg image/webp).freeze

  attr_accessor(*KEYS)

  validates :status_character_limit, :admin_status_character_limit,
            numericality: { only_integer: true, greater_than_or_equal_to: STATUS_LIMIT_RANGE.min, less_than_or_equal_to: STATUS_LIMIT_RANGE.max },
            if: -> { defined?(@status_character_limit) || defined?(@admin_status_character_limit) }
  validates :media_image_size_limit_mb,
            numericality: { only_integer: true, greater_than_or_equal_to: IMAGE_LIMIT_RANGE.min, less_than_or_equal_to: IMAGE_LIMIT_RANGE.max },
            if: -> { defined?(@media_image_size_limit_mb) }
  validates :media_video_size_limit_mb,
            numericality: { only_integer: true, greater_than_or_equal_to: VIDEO_LIMIT_RANGE.min, less_than_or_equal_to: VIDEO_LIMIT_RANGE.max },
            if: -> { defined?(@media_video_size_limit_mb) }
  validates(*COLOR_KEYS, format: { with: /\A#[0-9a-fA-F]{6}\z/ }, allow_blank: true)
  validate :admin_limit_is_not_lower
  validate :validate_color_contrast
  validate :validate_site_uploads

  KEYS.each do |key|
    define_method(key) do
      return instance_variable_get(:"@#{key}") if instance_variable_defined?(:"@#{key}")

      value = if UPLOAD_KEYS.include?(key)
                SiteUpload.where(var: key).first_or_initialize(var: key)
              else
                Setting.public_send(key)
              end
      instance_variable_set(:"@#{key}", value)
    end
  end

  UPLOAD_KEYS.each do |key|
    define_method(:"#{key}=") do |file|
      public_send(key).file = file
    rescue Mastodon::DimensionsValidationError => e
      errors.add(key, e.message)
    end
  end

  def save(reset_keys: [])
    return false unless errors.empty? && valid?

    reset_keys = reset_keys.map(&:to_sym) & KEYS
    ActiveRecord::Base.transaction do
      reset_keys.each { |key| reset(key) }

      KEYS.each do |key|
        next if reset_keys.include?(key) || !instance_variable_defined?(:"@#{key}")

        if UPLOAD_KEYS.include?(key)
          public_send(key).save!
        else
          Setting[key] = typecast(key, instance_variable_get(:"@#{key}"))
        end
      end
    end
    true
  rescue ActiveRecord::RecordInvalid => e
    errors.add(:base, e.record.errors.full_messages.to_sentence)
    false
  end

  def persisted?
    true
  end

  private

  def reset(key)
    if UPLOAD_KEYS.include?(key)
      SiteUpload.find_by(var: key)&.destroy!
    else
      Setting.find_by(var: key)&.destroy!
    end
  end

  def typecast(key, value)
    return Integer(value) if INTEGER_KEYS.include?(key)
    return ActiveModel::Type::Boolean.new.cast(value) if BOOLEAN_KEYS.include?(key)

    value
  end

  def admin_limit_is_not_lower
    return unless status_character_limit.present? && admin_status_character_limit.present?
    return if admin_status_character_limit.to_i >= status_character_limit.to_i

    errors.add(:admin_status_character_limit, :greater_than_or_equal_to, count: status_character_limit)
  end

  def validate_site_uploads
    UPLOAD_KEYS.each do |key|
      next unless instance_variable_defined?(:"@#{key}")

      upload = instance_variable_get(:"@#{key}")
      upload.errors.each { |error| errors.import(error, attribute: key) } unless upload.valid?
    end
  end

  def validate_color_contrast
    value = instance_accent_color
    if value.present? && value.match?(/\A#[0-9a-fA-F]{6}\z/) && contrast_ratio(value, '#ffffff') < 3.0
      errors.add(:instance_accent_color, I18n.t('admin.settings.instance_customization.contrast_error', ratio: 3.0))
    end

    validate_color_pair(:instance_light_text_color, :instance_light_background_color)
    validate_color_pair(:instance_dark_text_color, :instance_dark_background_color)
  end

  def validate_color_pair(foreground_key, background_key)
    foreground = public_send(foreground_key)
    background = public_send(background_key)
    return unless [foreground, background].all? { |value| value.present? && value.match?(/\A#[0-9a-fA-F]{6}\z/) }
    return if contrast_ratio(foreground, background) >= 4.5

    errors.add(foreground_key, I18n.t('admin.settings.instance_customization.pair_contrast_error', ratio: 4.5))
  end

  def contrast_ratio(first, second)
    lighter, darker = [first, second].map { |color| relative_luminance(color) }.sort.reverse
    (lighter + 0.05) / (darker + 0.05)
  end

  def relative_luminance(color)
    color.delete_prefix('#').scan(/../).map { |part| part.to_i(16) / 255.0 }.map { |channel| channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055)**2.4 }.then do |red, green, blue|
      (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
    end
  end
end
