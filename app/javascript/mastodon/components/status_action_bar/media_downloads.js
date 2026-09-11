const MEDIA_DOWNLOAD_LABELS = {
  en: {
    photo: 'Save photo',
    gif: 'Save GIF',
    video: 'Download video',
  },
  es: {
    photo: 'Guardar foto',
    gif: 'Guardar GIF',
    video: 'Descargar vídeo',
  },
  fr: {
    photo: 'Enregistrer la photo',
    gif: 'Enregistrer le GIF',
    video: 'Télécharger la vidéo',
  },
  pt: {
    photo: 'Salvar foto',
    gif: 'Salvar GIF',
    video: 'Baixar vídeo',
  },
};

const DOWNLOAD_KINDS = new Set(['photo', 'gif', 'video']);
const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/;

const MIME_EXTENSIONS = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

const languageForLocale = (locale) => {
  const language = locale?.toLowerCase().split(/[-_]/)[0];

  return Object.hasOwn(MEDIA_DOWNLOAD_LABELS, language) ? language : 'en';
};

const hasGifExtension = (url) => {
  if (!url) {
    return false;
  }

  try {
    return new URL(url, 'https://media.invalid').pathname.toLowerCase().endsWith('.gif');
  } catch {
    return false;
  }
};

const mediaDownloadUrl = (attachmentId) => `/media_proxy/${encodeURIComponent(attachmentId)}/original?download=1`;

const normalizedContentType = (response, blob) => {
  const contentType = blob.type || response.headers.get('Content-Type') || '';

  return contentType.split(';', 1)[0].trim().toLowerCase();
};

const safeFilename = (filename) => filename.split(/[\\/]/).pop();

const filenameFromContentDisposition = (contentDisposition) => {
  if (!contentDisposition) {
    return null;
  }

  const encodedMatch = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);

  if (encodedMatch) {
    const encodedFilename = encodedMatch[1].trim().replace(/^"|"$/g, '');

    try {
      return safeFilename(decodeURIComponent(encodedFilename));
    } catch {
      return safeFilename(encodedFilename);
    }
  }

  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);

  if (quotedMatch) {
    return safeFilename(quotedMatch[1]);
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);

  return plainMatch ? safeFilename(plainMatch[1].trim()) : null;
};

export const isIOSDevice = ({
  userAgent = navigator.userAgent,
  platform = navigator.platform,
  maxTouchPoints = navigator.maxTouchPoints,
} = {}) => IOS_DEVICE_PATTERN.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);

export const getMediaDownloadKind = (attachment) => {
  const downloadType = attachment.get('download_type');

  if (DOWNLOAD_KINDS.has(downloadType)) {
    return downloadType;
  }

  const type = attachment.get('type');

  if (type === 'gifv') {
    return 'gif';
  }

  if (type === 'video') {
    return 'video';
  }

  if (type === 'image') {
    if (hasGifExtension(attachment.get('url')) || hasGifExtension(attachment.get('remote_url'))) {
      return 'gif';
    }

    return 'photo';
  }

  return null;
};

export const getMediaDownloadLabel = (kind, locale) => MEDIA_DOWNLOAD_LABELS[languageForLocale(locale)][kind];

export const getMediaDownloadFilename = (response, blob, attachmentId) => {
  const contentDispositionFilename = filenameFromContentDisposition(response.headers.get('Content-Disposition'));

  if (contentDispositionFilename) {
    return contentDispositionFilename;
  }

  const extension = MIME_EXTENSIONS[normalizedContentType(response, blob)] || '';

  return `media-${attachmentId}${extension}`;
};

export const triggerBrowserDownload = (attachmentId) => {
  const link = document.createElement('a');
  link.href = mediaDownloadUrl(attachmentId);
  link.download = '';
  link.hidden = true;

  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const shareMediaOnIOS = async (attachmentId) => {
  if (!isIOSDevice() || typeof navigator.share !== 'function' || typeof File !== 'function') {
    return false;
  }

  const response = await fetch(mediaDownloadUrl(attachmentId), {
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`Could not fetch media attachment ${attachmentId} for sharing`);
  }

  const blob = await response.blob();
  const filename = getMediaDownloadFilename(response, blob, attachmentId);
  const file = new File([blob], filename, {
    type: normalizedContentType(response, blob) || 'application/octet-stream',
  });
  const shareData = { files: [file] };

  if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
    return false;
  }

  await navigator.share(shareData);

  return true;
};

export const triggerMediaDownload = async (attachmentId) => {
  try {
    if (await shareMediaOnIOS(attachmentId)) {
      return;
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return;
    }
  }

  triggerBrowserDownload(attachmentId);
};

export const buildMediaDownloadMenuItems = (attachments, locale) => {
  if (!attachments?.size) {
    return [];
  }

  return attachments.reduce((items, attachment) => {
    const kind = getMediaDownloadKind(attachment);

    if (!kind) {
      return items;
    }

    items.push({
      text: getMediaDownloadLabel(kind, locale),
      action: () => triggerMediaDownload(attachment.get('id')),
    });

    return items;
  }, []);
};
