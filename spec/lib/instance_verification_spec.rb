# frozen_string_literal: true

require 'rails_helper'

RSpec.describe InstanceVerification do
  describe '.local_badge' do
    it 'builds a safe source-colored vector description' do
      Setting.instance_accent_color = '#d52a96'

      expect(described_class.local_badge).to include(
        'view_box' => '0 0 24 24',
        'path' => described_class::BADGE_PATH,
        'colors' => ['#dd55ab', '#d52a96', '#aa2278']
      )
    end
  end

  describe '.normalize_badge' do
    it 'accepts only declarative SVG path and hexadecimal palette data' do
      badge = {
        'mediaType' => 'image/svg+xml',
        'viewBox' => '0 0 16 16',
        'svgPath' => 'M1 1L15 15Z',
        'colors' => ['#D52A96'],
      }

      expect(described_class.normalize_badge(badge)).to eq(
        'view_box' => '0 0 16 16',
        'path' => 'M1 1L15 15Z',
        'colors' => ['#d52a96']
      )
    end

    it 'rejects executable or malformed vector data' do
      badge = {
        'mediaType' => 'image/svg+xml',
        'viewBox' => '0 0 16 16',
        'svgPath' => 'M0 0" onload="alert(1)',
        'colors' => ['red'],
      }

      expect(described_class.normalize_badge(badge)).to be_nil
    end
  end
end
