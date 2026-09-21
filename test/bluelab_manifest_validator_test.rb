# frozen_string_literal: true

require 'minitest/autorun'
require 'pathname'
require 'tempfile'
require_relative '../lib/bluelab/manifest_validator'

class BlueLabManifestValidatorTest < Minitest::Test
  def setup
    @root = Pathname.new(File.expand_path('..', __dir__))
  end

  def test_accepts_checked_in_manifest
    result = validate_file(@root.join('bluelab/manifest.yml'))

    assert_predicate result, :valid?
  end

  def test_rejects_duplicate_domain_ids
    data = manifest
    data['customizations'] << Marshal.load(Marshal.dump(data['customizations'].first))

    assert_includes validate_data(data).errors, 'id duplicado: sample-domain'
  end

  def test_rejects_path_outside_repository
    data = manifest
    data['customizations'].first['tests'] = ['../outside']

    assert_includes validate_data(data).errors, 'customizations[0].tests contém caminho inseguro: ../outside'
  end

  private

  def manifest
    {
      'version' => 1,
      'inventory' => {
        'compared_from' => 'a',
        'compared_to' => 'b',
        'method' => 'git diff',
        'raw_difference' => { 'paths' => 2, 'added' => 1, 'modified' => 1 },
      },
      'customizations' => [
        {
          'id' => 'sample-domain',
          'name' => 'Sample domain',
          'category' => ['UI'],
          # rubocop:disable-next I18n/RailsI18n/DecorateString
          'description' => 'A manifest entry used only by this validator test.',
          'files' => ['README.md'],
          'integration_points' => ['UI root'],
          'risk' => 'low',
          'criticality' => 'low',
          'surface' => 'frontend',
          'isolation' => 'B',
          'tests' => ['README.md'],
          'missing_tests' => [],
        },
      ],
    }
  end

  def validate_data(data)
    Tempfile.create(['bluelab-manifest', '.yml']) do |file|
      file.write(YAML.dump(data))
      file.flush
      return validate_file(file.path)
    end
  end

  def validate_file(path)
    BlueLab::ManifestValidator.new(path: path, root: @root).validate
  end
end
