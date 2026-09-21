# frozen_string_literal: true

require 'fileutils'
require 'json'
require 'open3'
require 'securerandom'
require 'time'
require 'tmpdir'
require 'yaml'
require_relative 'manifest_validator'

module BlueLab
  class TransactionPlanner
    SENSITIVE_CATEGORIES = %w(AUTH SECURITY DATABASE MIGRATION PASSKEY UPLOAD).freeze

    Result = Data.define(:status, :report_path, :errors) do
      def ready?
        status == 'READY_FOR_HUMAN_REVIEW'
      end
    end

    def initialize(repo:, upstream_ref:, state_dir:, test_ref: 'HEAD', manifest_path: nil)
      @repo = File.expand_path(repo)
      @upstream_ref = upstream_ref
      @test_ref = test_ref
      @state_dir = File.expand_path(state_dir)
      @manifest_path = manifest_path || File.join(@repo, 'bluelab/manifest.yml')
      @commands = []
    end

    def run
      started_at = Time.now.utc.iso8601
      errors = precondition_errors
      return write_result('PRECONDITION_FAILED', started_at, errors: errors) unless errors.empty?

      manifest = YAML.safe_load_file(@manifest_path, aliases: false)
      test_sha = git('rev-parse', @test_ref).strip
      upstream_sha = git('rev-parse', @upstream_ref).strip
      worktree = Dir.mktmpdir('bluelab-transaction-')

      begin
        run_git(@repo, 'worktree', 'add', '--detach', worktree, test_sha)
        merge = run_git(worktree, 'merge', '--no-commit', '--no-ff', upstream_sha, allow_failure: true)
        conflicts = git_in(worktree, 'diff', '--name-only', '--diff-filter=U').lines(chomp: true)

        if !merge.success? || !conflicts.empty?
          run_git(worktree, 'merge', '--abort', allow_failure: true)
          return write_result(
            'NEEDS_SEMANTIC_REVIEW',
            started_at,
            test_sha:,
            upstream_sha:,
            manifest:,
            conflicts:,
            changed_paths: conflicts,
            errors: ['merge textual exige revisão humana']
          )
        end

        changed_paths = git_in(worktree, 'diff', '--cached', '--name-only').lines(chomp: true)
        diff_check = run_git(worktree, 'diff', '--cached', '--check', allow_failure: true)
        domains = classify(manifest, changed_paths)
        errors = []
        errors << 'git diff --check falhou no worktree' unless diff_check.success?
        errors << 'há caminhos sem domínio no manifesto' if domains.any? { |domain| domain['id'] == 'UNCLASSIFIED' }
        errors << 'há domínios sensíveis que exigem revisão semântica' if domains.any? { |domain| domain['semantic_review'] }
        status = errors.empty? ? 'READY_FOR_HUMAN_REVIEW' : 'NEEDS_SEMANTIC_REVIEW'

        write_result(status, started_at, test_sha:, upstream_sha:, manifest:, changed_paths:, domains:, errors:)
      ensure
        run_git(@repo, 'worktree', 'remove', worktree, allow_failure: true) if worktree && File.directory?(worktree)
        FileUtils.remove_entry(worktree) if worktree && File.exist?(worktree)
      end
    rescue Psych::Exception => e
      write_result('PRECONDITION_FAILED', started_at, errors: ["manifesto YAML inválido: #{e.message}"])
    end

    private

    CommandResult = Data.define(:stdout, :stderr, :success?)

    def precondition_errors
      errors = []
      errors << "repositório inválido: #{@repo}" unless File.directory?(File.join(@repo, '.git'))
      errors << "manifesto ausente: #{@manifest_path}" unless File.file?(@manifest_path)
      return errors unless errors.empty?

      errors << 'a árvore ativa deve estar limpa' unless git_in(@repo, 'status', '--porcelain=v1').empty?
      validation = ManifestValidator.new(path: @manifest_path, root: @repo).validate
      errors.concat(validation.errors.map { |error| "manifesto: #{error}" })
      errors
    end

    def classify(manifest, paths)
      paths.map do |path|
        matches = manifest.fetch('customizations').select do |customization|
          customization.fetch('files').any? do |declared|
            prefix = declared.delete_suffix('/')
            path == prefix || path.start_with?("#{prefix}/")
          end
        end
        next { 'path' => path, 'id' => 'UNCLASSIFIED', 'isolation' => nil, 'semantic_review' => true } if matches.empty?

        customization = matches.first
        categories = customization.fetch('category')
        {
          'path' => path,
          'id' => customization.fetch('id'),
          'isolation' => customization.fetch('isolation'),
          'semantic_review' => customization.fetch('isolation') == 'D' || (categories & SENSITIVE_CATEGORIES).any?,
        }
      end
    end

    def write_result(status, started_at, test_sha: nil, upstream_sha: nil, manifest: nil, changed_paths: [], conflicts: [], domains: [], errors: [])
      FileUtils.mkdir_p(File.join(@state_dir, 'transactions'))
      id = "#{Time.now.utc.strftime('%Y%m%dT%H%M%SZ')}-#{SecureRandom.uuid}"
      report_path = File.join(@state_dir, 'transactions', "#{id}.json")
      report = {
        id:,
        status:,
        test_sha:,
        upstream_ref: @upstream_ref,
        upstream_sha:,
        manifest_sha: manifest && git_in(@repo, 'hash-object', @manifest_path).strip,
        changed_paths:,
        conflicts:,
        domains:,
        errors:,
        commands: @commands,
        started_at:,
        finished_at: Time.now.utc.iso8601,
      }
      File.write(report_path, "#{JSON.pretty_generate(report)}\n")
      Result.new(status, report_path, errors)
    end

    def git(*arguments)
      result = run_git(@repo, *arguments)
      raise "git #{arguments.join(' ')} falhou: #{result.stderr}" unless result.success?

      result.stdout
    end

    def git_in(directory, *arguments)
      result = run_git(directory, *arguments)
      raise "git #{arguments.join(' ')} falhou: #{result.stderr}" unless result.success?

      result.stdout
    end

    def run_git(directory, *arguments, allow_failure: false)
      command = ['git', '-C', directory, *arguments]
      @commands << command.join(' ')
      stdout, stderr, process = Open3.capture3(*command)
      result = CommandResult.new(stdout, stderr, process.success?)
      raise "#{command.join(' ')} falhou: #{stderr}" if !allow_failure && !result.success?

      result
    end
  end
end
