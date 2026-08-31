# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ResumableMediaUploads::Finalizer, :attachment_processing do
  let(:account) { Fabricate(:account) }
  let(:storage_root) { Rails.root.join('tmp', 'spec-resumable-finalizer', SecureRandom.hex(8)) }
  let(:fixture_path) { Rails.root.join('spec', 'fixtures', 'files', 'attachment.jpg') }
  let(:contents) { File.binread(fixture_path) }
  let(:chunk_size) { (contents.bytesize / 2.0).ceil }
  let(:upload) do
    Fabricate(
      :resumable_media_upload,
      account: account,
      original_filename: 'photo.jpg',
      declared_content_type: 'image/jpeg',
      expected_size: contents.bytesize,
      chunk_size: chunk_size,
      chunk_count: 2
    )
  end

  before do
    Rails.configuration.x.resumable_media_uploads.storage_path = storage_root
    write_all_parts(upload, contents)
    upload.update!(state: :finalizing)
  end

  after do
    FileUtils.rm_rf(storage_root)
  end

  it 'validates the complete file and creates exactly one normal MediaAttachment' do
    expect do
      2.times { FinalizeResumableMediaUploadWorker.new.perform(upload.public_id) }
    end.to change(MediaAttachment, :count).by(1)

    upload.reload
    expect(upload).to be_state_completed
    expect(upload.media_attachment).to be_present
    expect(upload.media_attachment.account).to eq(account)
    expect(upload.sha256).to eq(Digest::SHA256.hexdigest(contents))
    expect(upload.parts).to_not exist
    expect(upload.storage_directory).to_not exist
  end

  it 'does not create an attachment if staging was corrupted after chunk validation' do
    File.open(upload.staging_path, 'r+b') do |file|
      file.seek(0)
      file.write('x')
    end

    expect { described_class.new(upload).call }.to_not change(MediaAttachment, :count)

    expect(upload.reload).to be_state_failed
    expect(upload.error_code).to eq('staging_checksum_mismatch')
    expect(upload.storage_directory).to_not exist
  end

  it 'does not create an attachment when assembly storage is missing' do
    FileUtils.rm_f(upload.staging_path)

    expect { described_class.new(upload).call }.to_not change(MediaAttachment, :count)

    expect(upload.reload).to be_state_failed
    expect(upload.error_code).to eq('missing_staging_file')
  end

  it 'applies the actual MediaAttachment size limit at finalization' do
    allow(MediaAttachment).to receive(:image_limit).and_return(contents.bytesize)

    expect { described_class.new(upload).call }.to_not change(MediaAttachment, :count)

    expect(upload.reload).to be_state_failed
    expect(upload.error_code).to eq('invalid_media')
  end

  context 'with content that is not valid media' do
    let(:contents) { 'not an image despite the extension' }

    it 'rejects the actual MIME type without leaving a broken attachment' do
      expect { described_class.new(upload).call }.to_not change(MediaAttachment, :count)

      expect(upload.reload).to be_state_failed
      expect(upload.error_code).to eq('invalid_media')
      expect(upload.media_attachment).to be_nil
    end
  end

  private

  def write_all_parts(target, data)
    data.bytes.each_slice(target.chunk_size).with_index do |bytes, index|
      chunk = bytes.pack('C*')
      ResumableMediaUploads::ChunkWriter.new(
        target,
        index: index.to_s,
        body: StringIO.new(chunk),
        content_length: chunk.bytesize.to_s,
        checksum: Digest::SHA256.hexdigest(chunk)
      ).call
    end
  end
end
