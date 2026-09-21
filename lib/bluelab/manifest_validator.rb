# frozen_string_literal: true

require 'yaml'
require 'pathname'

module BlueLab
  class ManifestValidator
    REQUIRED_INVENTORY_KEYS = %w(compared_from compared_to method raw_difference).freeze
    REQUIRED_CUSTOMIZATION_KEYS = %w(
      id name category description files integration_points risk criticality surface isolation tests missing_tests
    ).freeze
    ISOLATION_LEVELS = %w(A B C D).freeze
    PATH_LIST_KEYS = %w(files tests).freeze

    Result = Data.define(:errors) do
      def valid?
        errors.empty?
      end
    end

    def initialize(path:, root:)
      @path = path
      @root = File.expand_path(root)
      @errors = []
    end

    def validate
      manifest = YAML.safe_load_file(@path, aliases: false)
      validate_manifest(manifest)
      Result.new(@errors)
    rescue Psych::Exception => e
      Result.new(["YAML inválido: #{e.message}"])
    end

    private

    def validate_manifest(manifest)
      unless manifest.is_a?(Hash)
        error('a raiz deve ser um mapa YAML')
        return
      end

      error('version deve ser um inteiro positivo') unless manifest['version'].is_a?(Integer) && manifest['version'].positive?

      validate_inventory(manifest['inventory'])
      validate_customizations(manifest['customizations'])
    end

    def validate_inventory(inventory)
      unless inventory.is_a?(Hash)
        error('inventory deve ser um mapa YAML')
        return
      end

      missing = REQUIRED_INVENTORY_KEYS - inventory.keys
      error("inventory sem campos: #{missing.join(', ')}") unless missing.empty?

      raw_difference = inventory['raw_difference']
      unless raw_difference.is_a?(Hash)
        error('inventory.raw_difference deve ser um mapa YAML')
        return
      end

      %w(paths added modified).each do |key|
        error("inventory.raw_difference.#{key} deve ser um inteiro não negativo") unless raw_difference[key].is_a?(Integer) && raw_difference[key] >= 0
      end

      return unless %w(paths added modified).all? { |key| raw_difference[key].is_a?(Integer) }

      error('inventory.raw_difference.paths deve ser a soma de added e modified') unless raw_difference['paths'] == raw_difference['added'] + raw_difference['modified']
    end

    def validate_customizations(customizations)
      unless customizations.is_a?(Array) && !customizations.empty?
        error('customizations deve ser uma lista não vazia')
        return
      end

      ids = []
      customizations.each_with_index do |customization, index|
        prefix = "customizations[#{index}]"
        unless customization.is_a?(Hash)
          error("#{prefix} deve ser um mapa YAML")
          next
        end

        missing = REQUIRED_CUSTOMIZATION_KEYS - customization.keys
        error("#{prefix} sem campos: #{missing.join(', ')}") unless missing.empty?

        id = customization['id']
        if id.is_a?(String) && id.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/)
          ids << id
        else
          error("#{prefix}.id deve usar kebab-case")
        end

        error("#{prefix}.isolation deve ser A, B, C ou D") unless ISOLATION_LEVELS.include?(customization['isolation'])
        validate_string_list(customization, prefix, 'category')
        validate_string_list(customization, prefix, 'integration_points')
        validate_string_list(customization, prefix, 'missing_tests')
        PATH_LIST_KEYS.each { |key| validate_paths(customization, prefix, key) }
      end

      ids.tally.each { |id, count| error("id duplicado: #{id}") if count > 1 }
    end

    def validate_string_list(customization, prefix, key)
      values = customization[key]
      error("#{prefix}.#{key} deve ser uma lista de textos") unless values.is_a?(Array) && values.all? { |value| value.is_a?(String) && !value.empty? }
    end

    def validate_paths(customization, prefix, key)
      values = customization[key]
      unless values.is_a?(Array) && values.all? { |value| value.is_a?(String) && !value.empty? }
        error("#{prefix}.#{key} deve ser uma lista de caminhos")
        return
      end

      values.each do |value|
        normalized = value.delete_suffix('/')
        if Pathname.new(normalized).absolute? || normalized.split('/').include?('..')
          error("#{prefix}.#{key} contém caminho inseguro: #{value}")
        elsif !File.exist?(File.join(@root, normalized))
          error("#{prefix}.#{key} não existe: #{value}")
        end
      end
    end

    def error(message)
      @errors << message
    end
  end
end
