# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MediaDownloadService do
  subject(:service) { described_class.new(media_attachment) }

  let(:paperclip_file) { instance_double(Paperclip::Attachment) }
  let(:source_file) do
    Tempfile.new(['media-download-service-spec-', '.mp4']).tap do |file|
      file.binmode
      file.write('source')
      file.flush
    end
  end

  after do
    source_file.close!
  rescue Errno::ENOENT
    nil
  end

  describe '#call' do
    context 'with an image attachment' do
      let(:media_attachment) do
        instance_double(
          MediaAttachment,
          id: 42,
          file: paperclip_file,
          file_file_name: 'photo.png',
          file_content_type: 'image/png',
          image?: true,
          gifv?: false,
          video?: false
        )
      end

      before do
        allow(paperclip_file).to receive(:path).with(:original).and_return(source_file.path)
      end

      it 'returns the stored original file without changing its type or filename' do
        result = service.call

        expect(result.path).to eq(source_file.path)
        expect(result.content_type).to eq('image/png')
        expect(result.filename).to eq('photo.png')
        expect(result.temporary_files).to be_empty
      end
    end

    context 'with a gifv attachment' do
      let(:command) { instance_double(Terrapin::CommandLine) }
      let(:media_attachment) do
        instance_double(
          MediaAttachment,
          id: 84,
          file: paperclip_file,
          file_file_name: 'animated.mp4',
          file_content_type: 'video/mp4',
          image?: false,
          gifv?: true,
          video?: false
        )
      end

      before do
        allow(paperclip_file).to receive(:path).with(:original).and_return(source_file.path)
        allow(Terrapin::CommandLine).to receive(:new).and_return(command)
        allow(command).to receive(:run) do |arguments|
          File.binwrite(arguments.fetch(:destination), 'GIF89a')
        end
      end

      it 'creates a real GIF download instead of renaming the stored MP4' do
        result = service.call

        expect(result.content_type).to eq('image/gif')
        expect(result.filename).to eq('animated.gif')
        expect(File.binread(result.path, 6)).to eq('GIF89a')
        expect(command).to have_received(:run).with(hash_including(source: source_file.path, filter: described_class::GIF_FILTER))
      ensure
        result&.cleanup
      end
    end

    context 'with an unsupported attachment type' do
      let(:media_attachment) do
        instance_double(
          MediaAttachment,
          id: 126,
          image?: false,
          gifv?: false,
          video?: false
        )
      end

      it 'does not expose a download through this status-menu feature' do
        expect { service.call }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end
end
