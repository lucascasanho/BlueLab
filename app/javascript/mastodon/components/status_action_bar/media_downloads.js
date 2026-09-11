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

export const getMediaDownloadKind = (attachment) => {
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

export const triggerMediaDownload = (attachmentId) => {
  const link = document.createElement('a');
  link.href = `/media_proxy/${encodeURIComponent(attachmentId)}/original?download=1`;
  link.download = '';
  link.hidden = true;

  document.body.appendChild(link);
  link.click();
  link.remove();
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
