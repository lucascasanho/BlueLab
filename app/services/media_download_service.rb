# frozen_string_literal: true

class MediaDownloadService
  class Error < StandardError; end

  GIF_FILTER = '[0:v]split[v0][v1];[v0]palettegen=stats_mode=diff[p];[v1][p]paletteuse=dither=sierra2_4a'

  Result = Struct.new(:path, :content_type, :filename, :temporary_files, keyword_init: true) do
    def cleanup
      temporary_files&.each do |file|
        file.close!
      rescue Errno::ENOENT
        nil
      end
    end
  end

  def initialize(media_attachment)
    @media_attachment = media_attachment
  end

  def call
    raise ActiveRecord::RecordNotFound unless supported?

    media_attachment.gifv? ? build_gif : original_file
  end

  private

  attr_reader :media_attachment

  def supported?
    media_attachment.image? || media_attachment.gifv? || media_attachment.video?
  end

  def original_file
    path, temporary_file = materialize_original

    Result.new(
      path: path,
      content_type: media_attachment.file_content_type.presence || 'application/octet-stream',
      filename: original_filename,
      temporary_files: [temporary_file].compact
    )
  end

  def build_gif
    source_path, source_temporary_file = materialize_original
    output = Tempfile.new(["media-download-#{media_attachment.id}-", '.gif'])
    output.binmode
    output.close

    command = Terrapin::CommandLine.new(
      Rails.configuration.x.ffmpeg_binary,
      '-nostdin -i :source -filter_complex :filter -an -loop 0 -f gif -y :destination',
      logger: Paperclip.logger
    )

    command.run(source: source_path, filter: GIF_FILTER, destination: output.path)

    Result.new(
      path: output.path,
      content_type: 'image/gif',
      filename: gif_filename,
      temporary_files: [output]
    )
  rescue Terrapin::ExitStatusError => e
    output&.close!
    raise Error, "Could not convert media attachment #{media_attachment.id} to GIF: #{e.message}"
  rescue Terrapin::CommandNotFoundError => e
    output&.close!
    raise Error, "Could not run ffmpeg for media attachment #{media_attachment.id}: #{e.message}"
  ensure
    source_temporary_file&.close!
  end

  def materialize_original
    path = media_attachment.file.path(:original)

    return [path, nil] if path.present? && File.file?(path)

    extension = File.extname(original_filename)
    temporary_file = Tempfile.new(["media-download-source-#{media_attachment.id}-", extension])
    temporary_file.binmode
    temporary_file.close
    media_attachment.file.copy_to_local_file(:original, temporary_file.path)

    [temporary_file.path, temporary_file]
  end

  def original_filename
    File.basename(media_attachment.file_file_name.presence || "media-#{media_attachment.id}")
  end

  def gif_filename
    "#{File.basename(original_filename, '.*')}.gif"
  end
end
