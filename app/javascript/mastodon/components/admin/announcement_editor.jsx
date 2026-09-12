import { useCallback, useMemo, useRef, useState } from 'react';

import { Provider } from 'react-redux';

import api from '@/mastodon/api';
import { ComposeEmojiButton } from '@/mastodon/features/compose/redesign/emoji';
import {
  getSavedComposerSelectionOffset,
  setSavedComposerSelectionOffset,
} from '@/mastodon/features/compose/redesign/emoji_selection';
import { RichComposeEditor } from '@/mastodon/features/compose/redesign/rich_editor';
import { store } from '@/mastodon/store';

const COPY = {
  en: {
    plainText: 'Plain text',
    uploading: 'Uploading…',
    addMedia: 'Add media/GIF',
    remove: 'Remove',
    description: 'Media description',
    descriptionPlaceholder: 'Describe this media for accessibility',
    hint: 'You can also paste or drag images, GIFs, videos and audio directly into the editor.',
    uploadFailed: 'Media upload failed',
    descriptionFailed: 'Could not save the media description',
    processingTimeout: 'Media processing timed out',
    image: 'Image',
    gifv: 'GIF',
    video: 'Video',
    audio: 'Audio',
    media: 'Media',
  },
  es: {
    plainText: 'Texto simple',
    uploading: 'Subiendo…',
    addMedia: 'Añadir multimedia/GIF',
    remove: 'Eliminar',
    description: 'Descripción del contenido multimedia',
    descriptionPlaceholder: 'Describe este contenido para accesibilidad',
    hint: 'También puedes pegar o arrastrar imágenes, GIF, vídeos y audio directamente al editor.',
    uploadFailed: 'Error al subir el contenido multimedia',
    descriptionFailed: 'No se pudo guardar la descripción del contenido multimedia',
    processingTimeout: 'Se agotó el tiempo de procesamiento del contenido multimedia',
    image: 'Imagen',
    gifv: 'GIF',
    video: 'Vídeo',
    audio: 'Audio',
    media: 'Multimedia',
  },
  fr: {
    plainText: 'Texte brut',
    uploading: 'Envoi…',
    addMedia: 'Ajouter un média/GIF',
    remove: 'Retirer',
    description: 'Description du média',
    descriptionPlaceholder: 'Décrivez ce média pour l’accessibilité',
    hint: 'Vous pouvez aussi coller ou glisser des images, GIF, vidéos et fichiers audio directement dans l’éditeur.',
    uploadFailed: 'Échec de l’envoi du média',
    descriptionFailed: 'Impossible d’enregistrer la description du média',
    processingTimeout: 'Le traitement du média a expiré',
    image: 'Image',
    gifv: 'GIF',
    video: 'Vidéo',
    audio: 'Audio',
    media: 'Média',
  },
  pt: {
    plainText: 'Texto simples',
    uploading: 'Enviando…',
    addMedia: 'Adicionar mídia/GIF',
    remove: 'Remover',
    description: 'Descrição da mídia',
    descriptionPlaceholder: 'Descreva esta mídia para acessibilidade',
    hint: 'Você também pode colar ou arrastar imagens, GIFs, vídeos e áudios diretamente para o editor.',
    uploadFailed: 'Falha ao enviar mídia',
    descriptionFailed: 'Não foi possível salvar a descrição da mídia',
    processingTimeout: 'O processamento da mídia expirou',
    image: 'Imagem',
    gifv: 'GIF',
    video: 'Vídeo',
    audio: 'Áudio',
    media: 'Mídia',
  },
};

const getCopy = () => {
  const locale = (document.documentElement.lang || 'en').toLowerCase();
  const language = locale.split('-')[0];

  return COPY[language] || COPY.en;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadMedia = async (file, copy) => {
  const body = new FormData();
  body.append('file', file);

  const response = await api().post('/api/v2/media', body);
  if (response.status === 200) return response.data;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(Math.min(10_000, Math.max(1_000, 1_000 * 2 ** attempt)));
    const poll = await api().get(`/api/v1/media/${response.data.id}`, {
      validateStatus: (status) => status === 200 || status === 206,
    });
    if (poll.status === 200) return poll.data;
  }

  throw new Error(copy.processingTimeout);
};

const MediaPreview = ({
  media,
  copy,
  onRemove,
  onDescriptionChange,
  onDescriptionCommit,
}) => {
  const preview = media.preview_url || (media.type === 'image' ? media.url : null);
  const typeLabel = copy[media.type] || copy.media;

  return (
    <div className='communication-composer__media-item'>
      {preview && (
        <img
          src={preview}
          alt={media.description || ''}
          className='communication-composer__media-preview'
        />
      )}
      <div className='communication-composer__media-meta'>
        <strong>{typeLabel}</strong>
        <button
          type='button'
          className='button button-secondary'
          onClick={() => onRemove(media.id)}
        >
          {copy.remove}
        </button>
      </div>
      <label className='communication-composer__description-label'>
        <span>{copy.description}</span>
        <textarea
          value={media.description || ''}
          maxLength={10_000}
          placeholder={copy.descriptionPlaceholder}
          onChange={(event) =>
            onDescriptionChange(media.id, event.target.value)
          }
          onBlur={(event) =>
            void onDescriptionCommit(media.id, event.target.value)
          }
        />
      </label>
    </div>
  );
};

const AnnouncementEditor = ({
  initialText = '',
  initialContentType = 'text/markdown',
  initialMedia = [],
  maxMediaAttachments = 4,
}) => {
  const copy = useMemo(getCopy, []);
  const [text, setText] = useState(initialText);
  const [contentType, setContentType] = useState(
    initialContentType || 'text/markdown',
  );
  const [media, setMedia] = useState(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleEmojiPick = useCallback(
    (emoji) => {
      const insertion = emoji.native || `:${emoji.id}:`;
      const offset = Math.min(getSavedComposerSelectionOffset(), text.length);
      const nextText = `${text.slice(0, offset)}${insertion}${text.slice(offset)}`;
      setText(nextText);
      setSavedComposerSelectionOffset(offset + insertion.length);
    },
    [text],
  );

  const handleFiles = useCallback(
    async (files) => {
      if (!files?.length) return;

      setUploading(true);
      setUploadError(null);

      try {
        const uploaded = [];
        const remainingSlots = Math.max(0, maxMediaAttachments - media.length);

        for (const file of Array.from(files).slice(0, remainingSlots)) {
          uploaded.push(await uploadMedia(file, copy));
        }

        setMedia((current) =>
          [...current, ...uploaded].slice(0, maxMediaAttachments),
        );
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : copy.uploadFailed,
        );
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [copy, maxMediaAttachments, media.length],
  );

  const handleRemove = useCallback((id) => {
    setMedia((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleDescriptionChange = useCallback((id, description) => {
    setMedia((current) =>
      current.map((item) =>
        item.id === id ? { ...item, description } : item,
      ),
    );
  }, []);

  const handleDescriptionCommit = useCallback(
    async (id, description) => {
      try {
        await api().put(`/api/v1/media/${id}`, { description });
      } catch {
        setUploadError(copy.descriptionFailed);
      }
    },
    [copy.descriptionFailed],
  );

  return (
    <Provider store={store}>
      <div className='communication-composer'>
        <input type='hidden' name='announcement[text]' value={text} />
        <input
          type='hidden'
          name='announcement[content_type]'
          value={contentType}
        />
        <input
          type='hidden'
          name='announcement[media_attachment_ids][]'
          value=''
        />
        {media.map((item) => (
          <input
            key={item.id}
            type='hidden'
            name='announcement[media_attachment_ids][]'
            value={item.id}
          />
        ))}

        <div className='communication-composer__mode'>
          <button
            type='button'
            className={`button ${contentType === 'text/markdown' ? '' : 'button-secondary'}`}
            onClick={() => setContentType('text/markdown')}
          >
            Markdown
          </button>
          <button
            type='button'
            className={`button ${contentType === 'text/plain' ? '' : 'button-secondary'}`}
            onClick={() => setContentType('text/plain')}
          >
            {copy.plainText}
          </button>
        </div>

        <RichComposeEditor
          value={text}
          contentType={contentType}
          onChange={setText}
          onContentTypeChange={setContentType}
          onFiles={handleFiles}
          onSubmit={() =>
            document.querySelector('form.simple_form')?.requestSubmit()
          }
          dismissOnEscape={false}
        >
          <div className='communication-composer__actions'>
            <ComposeEmojiButton onPick={handleEmojiPick} />
            <button
              type='button'
              className='button button-secondary'
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || media.length >= maxMediaAttachments}
            >
              {uploading ? copy.uploading : copy.addMedia}
            </button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*,video/*,audio/*,.gif'
              multiple
              hidden
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>
        </RichComposeEditor>

        {uploadError && <p className='error'>{uploadError}</p>}

        {media.length > 0 && (
          <div className='communication-composer__media-grid'>
            {media.map((item) => (
              <MediaPreview
                key={item.id}
                media={item}
                copy={copy}
                onRemove={handleRemove}
                onDescriptionChange={handleDescriptionChange}
                onDescriptionCommit={handleDescriptionCommit}
              />
            ))}
          </div>
        )}

        <p className='hint'>{copy.hint}</p>
      </div>
    </Provider>
  );
};

export default AnnouncementEditor;
