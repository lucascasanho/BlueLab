import { useCallback, useRef, useState } from 'react';

import { Provider } from 'react-redux';

import api from '@/mastodon/api';
import { ComposeEmojiButton } from '@/mastodon/features/compose/redesign/emoji';
import {
  getSavedComposerSelectionOffset,
  setSavedComposerSelectionOffset,
} from '@/mastodon/features/compose/redesign/emoji_selection';
import { RichComposeEditor } from '@/mastodon/features/compose/redesign/rich_editor';
import { store } from '@/mastodon/store';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadMedia = async (file) => {
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

  throw new Error('Media processing timed out');
};

const MediaPreview = ({ media, onRemove }) => {
  const preview = media.preview_url || media.url;

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
        <strong>{media.type === 'image' ? 'Imagem/GIF' : media.type}</strong>
        <button type='button' className='button button-secondary' onClick={() => onRemove(media.id)}>
          Remover
        </button>
      </div>
    </div>
  );
};

const AnnouncementEditor = ({ initialText = '', initialContentType = 'text/markdown', initialMedia = [] }) => {
  const [text, setText] = useState(initialText);
  const [contentType, setContentType] = useState(initialContentType || 'text/markdown');
  const [media, setMedia] = useState(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleEmojiPick = useCallback((emoji) => {
    const insertion = emoji.native || `:${emoji.id}:`;
    const offset = Math.min(getSavedComposerSelectionOffset(), text.length);
    const nextText = `${text.slice(0, offset)}${insertion}${text.slice(offset)}`;
    setText(nextText);
    setSavedComposerSelectionOffset(offset + insertion.length);
  }, [text]);

  const handleFiles = useCallback(async (files) => {
    if (!files?.length) return;

    setUploading(true);
    setUploadError(null);

    try {
      const uploaded = [];
      for (const file of Array.from(files).slice(0, Math.max(0, 4 - media.length))) {
        uploaded.push(await uploadMedia(file));
      }
      setMedia((current) => [...current, ...uploaded].slice(0, 4));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Falha ao enviar mídia');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [media.length]);

  const handleRemove = useCallback((id) => {
    setMedia((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <Provider store={store}>
      <div className='communication-composer'>
        <input type='hidden' name='announcement[text]' value={text} />
        <input type='hidden' name='announcement[content_type]' value={contentType} />
        {media.map((item) => (
          <input key={item.id} type='hidden' name='announcement[media_attachment_ids][]' value={item.id} />
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
            Texto simples
          </button>
        </div>

        <RichComposeEditor
          value={text}
          contentType={contentType}
          onChange={setText}
          onContentTypeChange={setContentType}
          onFiles={handleFiles}
          onSubmit={() => document.querySelector('form.simple_form')?.requestSubmit()}
          dismissOnEscape={false}
        >
          <div className='communication-composer__actions'>
            <ComposeEmojiButton onPick={handleEmojiPick} />
            <button
              type='button'
              className='button button-secondary'
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || media.length >= 4}
            >
              {uploading ? 'Enviando…' : 'Adicionar mídia/GIF'}
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
              <MediaPreview key={item.id} media={item} onRemove={handleRemove} />
            ))}
          </div>
        )}

        <p className='hint'>
          Você também pode colar ou arrastar imagens, GIFs, vídeos e áudios diretamente para o editor.
        </p>
      </div>
    </Provider>
  );
};

export default AnnouncementEditor;
