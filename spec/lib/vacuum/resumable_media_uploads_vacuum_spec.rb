# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Vacuum::ResumableMediaUploadsVacuum do
  let(:storage_root) { Rails.root.join('tmp', 'spec-resumable-vacuum', SecureRandom.hex(8)) }

  before do
    Rails.configuration.x.resumable_media_uploads.storage_path = storage_root
  end

  after do
    FileUtils.rm_rf(storage_root)
  end

  it 'expires abandoned sessions and removes their database and filesystem data' do
    upload = Fabricate(:resumable_media_upload)
    write_chunk(upload, 'abcd')
    upload.update!(expires_at: 1.minute.ago)
    directory = upload.storage_directory

    described_class.new.perform

    expect(ResumableMediaUpload.where(id: upload.id)).to_not exist
    expect(directory).to_not exist
  end

  it 'keeps active sessions that have not expired' do
    upload = Fabricate(:resumable_media_upload, expires_at: 1.hour.from_now)
    write_chunk(upload, 'abcd')

    described_class.new.perform

    expect(upload.reload).to be_state_active
    expect(upload.storage_directory).to exist
  end

  it 'recovers a finalization that remained stuck beyond its timeout' do
    upload = Fabricate(
      :resumable_media_upload,
      state: :finalizing,
      updated_at: (ResumableMediaUpload::FINALIZATION_TIMEOUT + 1.minute).ago,
      expires_at: 1.hour.from_now
    )
    FileUtils.mkdir_p(upload.storage_directory)

    described_class.new.perform

    expect(ResumableMediaUpload.where(id: upload.id)).to_not exist
    expect(upload.storage_directory).to_not exist
  end

  private

  def write_chunk(upload, contents)
    ResumableMediaUploads::ChunkWriter.new(
      upload,
      index: '0',
      body: StringIO.new(contents),
      content_length: contents.bytesize.to_s,
      checksum: Digest::SHA256.hexdigest(contents)
    ).call
  end
end
