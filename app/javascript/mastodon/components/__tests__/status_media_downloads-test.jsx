import { fromJS, List } from 'immutable';

import {
  buildMediaDownloadMenuItems,
  getMediaDownloadFilename,
  getMediaDownloadKind,
  getMediaDownloadLabel,
  isIOSDevice,
} from '../status_action_bar/media_downloads';

describe('status media downloads', () => {
  describe('isIOSDevice', () => {
    it('detects iPhone and iPad user agents', () => {
      expect(isIOSDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
      expect(isIOSDevice({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 27_0 like Mac OS X)', platform: 'iPad', maxTouchPoints: 5 })).toBe(true);
    });

    it('detects iPadOS when it reports a desktop Mac platform', () => {
      expect(isIOSDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    });

    it('does not classify a regular desktop Mac as iOS', () => {
      expect(isIOSDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    });
  });

  describe('getMediaDownloadKind', () => {
    it('distinguishes photos, GIFs and videos from actual media attachments', () => {
      expect(getMediaDownloadKind(fromJS({ type: 'image', url: 'https://example.com/photo.jpg' }))).toBe('photo');
      expect(getMediaDownloadKind(fromJS({ type: 'image', url: 'https://example.com/static.gif' }))).toBe('gif');
      expect(getMediaDownloadKind(fromJS({ type: 'gifv', url: 'https://example.com/animated.mp4' }))).toBe('gif');
      expect(getMediaDownloadKind(fromJS({ type: 'video', url: 'https://example.com/video.mp4' }))).toBe('video');
    });

    it('prefers the exact download kind reported by the server', () => {
      const attachment = fromJS({
        type: 'image',
        download_type: 'gif',
        url: 'https://example.com/media/without-extension',
      });

      expect(getMediaDownloadKind(attachment)).toBe('gif');
    });

    it('uses the original remote URL to recognize a proxied static GIF as a compatibility fallback', () => {
      const attachment = fromJS({
        type: 'image',
        url: '/media_proxy/42/original',
        remote_url: 'https://remote.example/media/original.gif?cache=1',
      });

      expect(getMediaDownloadKind(attachment)).toBe('gif');
    });

    it('does not expose unsupported attachment types', () => {
      expect(getMediaDownloadKind(fromJS({ type: 'audio' }))).toBeNull();
      expect(getMediaDownloadKind(fromJS({ type: 'unknown' }))).toBeNull();
    });
  });

  describe('getMediaDownloadLabel', () => {
    it('uses the requested priority interface languages', () => {
      expect(getMediaDownloadLabel('photo', 'pt-BR')).toBe('Salvar foto');
      expect(getMediaDownloadLabel('gif', 'en-US')).toBe('Save GIF');
      expect(getMediaDownloadLabel('video', 'es-ES')).toBe('Descargar vídeo');
      expect(getMediaDownloadLabel('photo', 'fr-FR')).toBe('Enregistrer la photo');
    });

    it('falls back to English for other interface languages', () => {
      expect(getMediaDownloadLabel('video', 'de')).toBe('Download video');
    });
  });

  describe('getMediaDownloadFilename', () => {
    it('preserves the filename sent by the authenticated media endpoint', () => {
      const response = {
        headers: new Headers({
          'Content-Disposition': "attachment; filename*=UTF-8''foto%20teste.png",
          'Content-Type': 'image/png',
        }),
      };
      const blob = new Blob(['image'], { type: 'image/png' });

      expect(getMediaDownloadFilename(response, blob, '42')).toBe('foto teste.png');
    });

    it('uses the response MIME type to create a safe fallback filename', () => {
      const response = {
        headers: new Headers({ 'Content-Type': 'video/mp4' }),
      };
      const blob = new Blob(['video'], { type: 'video/mp4' });

      expect(getMediaDownloadFilename(response, blob, '84')).toBe('media-84.mp4');
    });
  });

  describe('buildMediaDownloadMenuItems', () => {
    it('adds entries only when status media attachments are present', () => {
      expect(buildMediaDownloadMenuItems(List(), 'pt-BR')).toEqual([]);

      const attachments = fromJS([
        { id: '1', type: 'image', download_type: 'photo', url: 'https://example.com/photo.png' },
        { id: '2', type: 'audio', url: 'https://example.com/audio.mp3' },
      ]);
      const items = buildMediaDownloadMenuItems(attachments, 'pt-BR');

      expect(items).toHaveLength(1);
      expect(items[0].text).toBe('Salvar foto');
      expect(items[0].action).toEqual(expect.any(Function));
    });

    it('preserves GIF kind in the action path so iOS can use the retry flow', () => {
      const attachments = fromJS([
        { id: '3', type: 'gifv', download_type: 'gif', url: 'https://example.com/animated.mp4' },
      ]);
      const items = buildMediaDownloadMenuItems(attachments, 'pt-BR');

      expect(items).toHaveLength(1);
      expect(items[0].text).toBe('Salvar GIF');
      expect(items[0].action).toEqual(expect.any(Function));
    });
  });
});
