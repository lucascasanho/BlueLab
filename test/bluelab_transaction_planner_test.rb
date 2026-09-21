# frozen_string_literal: true

require 'json'
require 'minitest/autorun'
require 'open3'
require 'tmpdir'
require_relative '../lib/bluelab/transaction_planner'

class BlueLabTransactionPlannerTest < Minitest::Test
  def test_ready_report_keeps_active_checkout_unchanged
    with_repository('README.md') do |repo, state_dir|
      initial_head = git(repo, 'rev-parse', 'HEAD').strip
      result = planner(repo, state_dir).run

      assert_predicate result, :ready?
      assert_equal initial_head, git(repo, 'rev-parse', 'HEAD').strip
      assert_equal '', git(repo, 'status', '--porcelain=v1')

      report = JSON.parse(File.read(result.report_path))
      assert_equal 'READY_FOR_HUMAN_REVIEW', report.fetch('status')
      assert_equal ['README.md'], report.fetch('changed_paths')
    end
  end

  def test_unclassified_path_requires_semantic_review
    with_repository('unclassified.txt') do |repo, state_dir|
      result = planner(repo, state_dir).run

      assert_equal 'NEEDS_SEMANTIC_REVIEW', result.status
      report = JSON.parse(File.read(result.report_path))
      assert_equal 'UNCLASSIFIED', report.fetch('domains').first.fetch('id')
    end
  end

  private

  def with_repository(changed_path)
    Dir.mktmpdir('bluelab-transaction-test-') do |directory|
      repo = File.join(directory, 'repo')
      state_dir = File.join(directory, 'state')
      execute('git', 'init', '-b', 'main', repo)
      execute('git', '-C', repo, 'config', 'user.name', 'BlueLab Test')
      execute('git', '-C', repo, 'config', 'user.email', 'test@example.invalid')
      FileUtils.mkdir_p(File.join(repo, 'bluelab'))
      File.write(File.join(repo, 'README.md'), "base\n")
      File.write(File.join(repo, 'bluelab/manifest.yml'), manifest)
      execute('git', '-C', repo, 'add', '.')
      execute('git', '-C', repo, 'commit', '-m', 'base')
      execute('git', '-C', repo, 'switch', '-c', 'upstream-candidate')
      File.write(File.join(repo, changed_path), "candidate\n")
      execute('git', '-C', repo, 'add', changed_path)
      execute('git', '-C', repo, 'commit', '-m', 'candidate')
      execute('git', '-C', repo, 'switch', 'main')
      yield repo, state_dir
    end
  end

  def planner(repo, state_dir)
    BlueLab::TransactionPlanner.new(repo:, upstream_ref: 'upstream-candidate', state_dir:)
  end

  def manifest
    <<~YAML
      version: 1
      inventory:
        compared_from: base
        compared_to: test
        method: test
        raw_difference:
          paths: 1
          added: 1
          modified: 0
      customizations:
        - id: sample-domain
          name: Sample domain
          category: [UI]
          description: Test manifest entry
          files: [README.md]
          integration_points: [UI]
          risk: low
          criticality: low
          surface: frontend
          isolation: B
          tests: [README.md]
          missing_tests: []
    YAML
  end

  def git(repo, *)
    execute('git', '-C', repo, *)
  end

  def execute(*command)
    stdout, stderr, status = Open3.capture3(*command)
    raise "#{command.join(' ')} failed: #{stderr}" unless status.success?

    stdout
  end
end
