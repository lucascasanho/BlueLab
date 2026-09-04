# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Blue resumable media uploads' do
  include_context 'with API authentication', oauth_scopes: 'write:media'

  let(:storage_root) { Rails.root.join('tmp', 'spec-resumable-media-uploads', SecureRandom.hex(8)) }

  before do
    Rails.configuration.x.resumable_media_uploads.enabled = true
    Rails.configuration.x.resumable_media_uploads.storage_path = storage_root
  end

  after do
    FileUtils.rm_rf(storage_root)
  end

  describe 'POST /api/v1/blue/resumable_media_uploads' do
    subject do
      post '/api/v1/blue/resumable_media_uploads',
           headers: headers,
           params: { filename: 'large.mp4', size: 80.megabytes, content_type: 'video/mp4' }
    end

    it_behaves_like 'forbidden for wrong scope', 'read read:media'

    it 'creates an owned upload session with server-selected chunks' do
      subject

      expect(response).to have_http_status(201)
      expect(response.parsed_body).to include(
        state: 'active',
        expected_size: 80.megabytes,
        chunk_size: 64.megabytes,
        chunk_count: 2,
        uploaded_chunks: []
      )
      expect(ResumableMediaUpload.last.account).to eq(user.account)
    end

    it 'can be disabled without changing the official media endpoints' do
      Rails.configuration.x.resumable_media_uploads.enabled = false

      subject

      expect(response).to have_http_status(404)
      expect(ResumableMediaUpload).to_not exist
    end

    it 'rejects unsupported extensions before reserving storage' do
      post '/api/v1/blue/resumable_media_uploads',
           headers: headers,
           params: { filename: '../../payload.exe', size: 1.megabyte }

      expect(response).to have_http_status(400)
      expect(response.parsed_body[:code]).to eq('unsupported_extension')
      expect(ResumableMediaUpload).to_not exist
    end

    it 'enforces the effective instance media limit' do
      post '/api/v1/blue/resumable_media_uploads',
           headers: headers,
           params: { filename: 'too-large.mp4', size: MediaAttachment.video_limit }

      expect(response).to have_http_status(422)
      expect(response.parsed_body[:code]).to eq('file_too_large')
    end
  end

  describe 'session ownership' do
    let(:upload) { Fabricate(:resumable_media_upload) }

    it 'does not expose another account upload through any session operation' do
      get "/api/v1/blue/resumable_media_uploads/#{upload.public_id}", headers: headers
      expect(response).to have_http_status(404)

      put_chunk(upload, 0, 'abcd')
      expect(response).to have_http_status(404)

      post "/api/v1/blue/resumable_media_uploads/#{upload.public_id}/complete", headers: headers
      expect(response).to have_http_status(404)

      delete "/api/v1/blue/resumable_media_uploads/#{upload.public_id}", headers: headers
      expect(response).to have_http_status(404)
    end
  end

  describe 'GET /api/v1/blue/resumable_media_uploads/:id' do
    let(:upload) { Fabricate(:resumable_media_upload, account: user.account) }

    it 'returns received chunks so an interrupted upload can resume' do
      put_chunk(upload, 1, 'efgh')

      get "/api/v1/blue/resumable_media_uploads/#{upload.public_id}", headers: headers

      expect(response).to have_http_status(200)
      expect(response.parsed_body).to include('uploaded_chunks' => [1], 'uploaded_bytes' => 4)
    end
  end

  describe 'PUT /api/v1/blue/resumable_media_uploads/:id/chunks/:index' do
    let(:upload) { Fabricate(:resumable_media_upload, account: user.account) }

    it 'accepts chunks out of order and remounts them at exact offsets' do
      put_chunk(upload, 1, 'efgh')
      expect(response).to have_http_status(201)

      put_chunk(upload, 0, 'abcd')
      expect(response).to have_http_status(201)

      expect(File.binread(upload.staging_path)).to eq('abcdefgh')
      expect(upload.parts.order(:part_index).pluck(:part_index)).to eq([0, 1])
    end

    it 'treats an identical repeated chunk as idempotent' do
      put_chunk(upload, 0, 'abcd')
      put_chunk(upload, 0, 'abcd')

      expect(response).to have_http_status(200)
      expect(response.parsed_body[:duplicate]).to be true
      expect(upload.parts.where(part_index: 0).count).to eq(1)
    end

    it 'rejects an inconsistent repeated chunk' do
      put_chunk(upload, 0, 'abcd')
      put_chunk(upload, 0, 'wxyz')

      expect(response).to have_http_status(409)
      expect(response.parsed_body[:code]).to eq('inconsistent_duplicate_chunk')
      expect(File.binread(upload.staging_path, 4)).to eq('abcd')
    end

    it 'discards a chunk whose checksum is wrong' do
      put_chunk(upload, 0, 'abcd', checksum: Digest::SHA256.hexdigest('wrong'))

      expect(response).to have_http_status(422)
      expect(response.parsed_body[:code]).to eq('checksum_mismatch')
      expect(upload.parts).to_not exist
    end

    it 'rejects invalid indexes and chunk sizes' do
      put_chunk(upload, 2, 'abcd')
      expect(response).to have_http_status(400)
      expect(response.parsed_body[:code]).to eq('invalid_chunk_index')

      put_chunk(upload, 0, 'abc')
      expect(response).to have_http_status(400)
      expect(response.parsed_body[:code]).to eq('invalid_chunk_size')

      put_chunk(upload, 0, 'abcde')
      expect(response).to have_http_status(400)
      expect(response.parsed_body[:code]).to eq('invalid_chunk_size')
    end

    it 'rejects writes to an expired session' do
      upload.update!(expires_at: 1.minute.ago)
      put_chunk(upload, 0, 'abcd')

      expect(response).to have_http_status(409)
      expect(response.parsed_body[:code]).to eq('upload_expired')
    end
  end

  describe 'POST /api/v1/blue/resumable_media_uploads/:id/complete' do
    let(:upload) { Fabricate(:resumable_media_upload, account: user.account) }

    before do
      allow(FinalizeResumableMediaUploadWorker).to receive(:perform_async)
    end

    it 'rejects an upload with a missing chunk' do
      put_chunk(upload, 0, 'abcd')
      post "/api/v1/blue/resumable_media_uploads/#{upload.public_id}/complete", headers: headers

      expect(response).to have_http_status(422)
      expect(response.parsed_body[:code]).to eq('incomplete_upload')
      expect(FinalizeResumableMediaUploadWorker).to_not have_received(:perform_async)
    end

    it 'queues a complete upload exactly once when complete is repeated' do
      put_chunk(upload, 0, 'abcd')
      put_chunk(upload, 1, 'efgh')

      2.times do
        post "/api/v1/blue/resumable_media_uploads/#{upload.public_id}/complete", headers: headers
        expect(response).to have_http_status(202)
      end

      expect(upload.reload).to be_state_finalizing
      expect(FinalizeResumableMediaUploadWorker).to have_received(:perform_async).once.with(upload.public_id)
    end
  end

  describe 'DELETE /api/v1/blue/resumable_media_uploads/:id' do
    let(:upload) { Fabricate(:resumable_media_upload, account: user.account) }

    it 'cancels the session and removes all temporary data' do
      put_chunk(upload, 0, 'abcd')
      expect(upload.storage_directory).to exist

      delete "/api/v1/blue/resumable_media_uploads/#{upload.public_id}", headers: headers

      expect(response).to have_http_status(200)
      expect(ResumableMediaUpload.where(id: upload.id)).to_not exist
      expect(upload.storage_directory).to_not exist
    end
  end

  private

  def put_chunk(upload, index, contents, checksum: Digest::SHA256.hexdigest(contents))
    put "/api/v1/blue/resumable_media_uploads/#{upload.public_id}/chunks/#{index}",
        params: nil,
        headers: headers.merge(
          'CONTENT_TYPE' => 'application/octet-stream',
          'X-Chunk-SHA256' => checksum
        ),
        env: {
          'CONTENT_LENGTH' => contents.bytesize.to_s,
          'rack.input' => StringIO.new(contents),
        }
  end
end
