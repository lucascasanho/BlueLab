# frozen_string_literal: true

require 'rails_helper'

RSpec.describe REST::MediaAttachmentSerializer do
  describe '#download_type' do
    subject(:download_type) { described_class.new(media_attachment).download_type }

    let(:media_attachment) do
      instance_double(
        MediaAttachment,
        type: attachment_type,
        file_content_type: content_type
      )
    end
    let(:content_type) { nil }

    context 'with a regular image' do
      let(:attachment_type) { 'image' }
      let(:content_type) { 'image/png' }

      it { is_expected.to eq('photo') }
    end

    context 'with a static GIF image' do
      let(:attachment_type) { 'image' }
      let(:content_type) { 'image/gif' }

      it { is_expected.to eq('gif') }
    end

    context 'with an animated GIF stored as gifv' do
      let(:attachment_type) { 'gifv' }

      it { is_expected.to eq('gif') }
    end

    context 'with a video' do
      let(:attachment_type) { 'video' }

      it { is_expected.to eq('video') }
    end

    context 'with an unsupported media type' do
      let(:attachment_type) { 'audio' }

      it { is_expected.to be_nil }
    end
  end
end
