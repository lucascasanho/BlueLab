import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CodeIcon,
  ImageIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  SmileyIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from '@phosphor-icons/react';
import PickerRaw from 'emoji-mart/dist-es/components/picker/nimble-picker';
import { defineMessages, useIntl } from 'react-intl';

import EmojiData from '@/mastodon/features/emoji/emoji_data.json';
import {
  editorPlainText,
  editorText,
  getEditorSelectionOffset,
  markdownToHtml,
  plainTextToHtml,
} from '@/mastodon/features/compose/redesign/rich_editor';
import { assetHost } from '@/mastodon/utils/config';

import classes from './CommunicationEditor.module.scss';

const messages = defineMessages({
  markdown: { id: 'admin.communications.editor.markdown', defaultMessage: 'Markdown' },
  plain: { id: 'admin.communications.editor.plain', defaultMessage: 'Plain text' },
  formatting: { id: 'admin.communications.editor.formatting', defaultMessage: 'Formatting' },
  emoji: { id: 'admin.communications.editor.emoji', defaultMessage: 'Emoji' },
  media: { id: 'admin.communications.editor.media', defaultMessage: 'Add media' },
  bold: { id: 'compose.formatting.bold', defaultMessage: 'Bold' },
  italic: { id: 'compose.formatting.italic', defaultMessage: 'Italic' },
  underline: { id: 'compose.formatting.underline', defaultMessage: 'Underline' },
  strike: { id: 'compose.formatting.strikethrough', defaultMessage: 'Strikethrough' },
  quote: { id: 'compose.formatting.quote', defaultMessage: 'Quote' },
  bullets: { id: 'compose.formatting.bulleted_list', defaultMessage: 'Bulleted list' },
  numbers: { id: 'compose.formatting.numbered_list', defaultMessage: 'Numbered list' },
  code: { id: 'compose.formatting.inline_code', defaultMessage: 'Code' },
  link: { id: 'compose.formatting.link', defaultMessage: 'Link' },
  linkUrl: { id: 'compose.formatting.link_url', defaultMessage: 'Link URL' },
  remove: { id: 'admin.communications.editor.remove_media', defaultMessage: 'Remove' },
  selectedMedia: { id: 'admin.communications.editor.selected_media', defaultMessage: 'Selected media' },
  mediaLimit: {
    id: 'admin.communications.editor.media_limit',
    defaultMessage: 'You can attach up to {count} media files.',
  },
  placeholder: {
    id: 'admin.communications.editor.placeholder',
    defaultMessage: 'Write a communication for this server…',
  },
});

const backgroundImageFn = () => `${assetHost}/emoji/sheet_16_0.png`;

const logicalNodeLength = (node) => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0;
  if (!(node instanceof HTMLElement)) return 0;
  if (node.dataset.emojiShortcode) return node.dataset.emojiShortcode.length;
  if (node.tagName === 'BR') return 1;
  return Array.from(node.childNodes).reduce(
    (total, child) => total + logicalNodeLength(child),
    0,
  );
};

const restoreEditorSelectionOffset = (editor, requestedOffset) => {
  const selection = window.getSelection();
  if (!selection) return;

  const targetOffset = Math.max(0, requestedOffset);
  let consumed = 0;
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  let node = walker.nextNode();

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parentEmoji = node.parentElement?.closest('[data-emoji-shortcode]');
      if (!parentEmoji) {
        const length = node.textContent?.length ?? 0;
        if (targetOffset <= consumed + length) {
          const range = document.createRange();
          range.setStart(node, Math.max(0, targetOffset - consumed));
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
        consumed += length;
      }
    } else if (node instanceof HTMLElement) {
      const shortcode = node.dataset.emojiShortcode;
      const atomicLength = shortcode?.length ?? (node.tagName === 'BR' ? 1 : 0);
      if (atomicLength > 0) {
        if (targetOffset <= consumed + atomicLength) {
          const range = document.createRange();
          range.setStartAfter(node);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
        consumed += atomicLength;
      }
    }

    node = walker.nextNode();
  }

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const mediaPreview = (media, source, className) => {
  const type = media.type ?? source.type?.split('/')[0];

  if (type === 'audio') {
    return <audio className={className} controls src={source.url} />;
  }

  if (type === 'video' || type === 'gifv') {
    return <video className={className} controls muted src={source.url} />;
  }

  return <img className={className} src={source.previewUrl ?? source.url} alt='' />;
};

const CommunicationEditor = ({
  textarea_id: textareaId,
  content_type_id: contentTypeId,
  file_input_id: fileInputId,
  custom_emojis: customEmojis,
  existing_media: existingMedia,
  max_media: maxMedia,
}) => {
  const intl = useIntl();
  const editorRef = useRef(null);
  const textareaRef = useRef(null);
  const contentTypeInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const composingRef = useRef(false);
  const [value, setValue] = useState('');
  const [contentType, setContentType] = useState('text/markdown');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [removedMediaIds, setRemovedMediaIds] = useState(new Set());
  const [emojiSuggestions, setEmojiSuggestions] = useState([]);

  const customEmojiMap = useMemo(
    () =>
      Object.fromEntries(
        customEmojis.map((emoji) => [
          emoji.shortcode,
          { static_url: emoji.static_url, url: emoji.url },
        ]),
      ),
    [customEmojis],
  );

  const pickerCustomEmojis = useMemo(
    () =>
      customEmojis.map((emoji) => ({
        id: emoji.shortcode,
        name: emoji.shortcode,
        short_names: [emoji.shortcode],
        text: '',
        emoticons: [],
        keywords: [],
        imageUrl: emoji.url,
      })),
    [customEmojis],
  );

  const renderValue = useCallback(
    (nextValue, nextContentType, caretOffset = null) => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.innerHTML =
        nextContentType === 'text/markdown'
          ? markdownToHtml(nextValue, customEmojiMap)
          : plainTextToHtml(nextValue, customEmojiMap);

      if (caretOffset !== null) {
        editor.focus({ preventScroll: true });
        restoreEditorSelectionOffset(editor, caretOffset);
      }
    },
    [customEmojiMap],
  );

  useEffect(() => {
    const textarea = document.getElementById(textareaId);
    const contentTypeInput = document.getElementById(contentTypeId);
    const fileInput = document.getElementById(fileInputId);

    if (!(textarea instanceof HTMLTextAreaElement)) return undefined;

    textareaRef.current = textarea;
    contentTypeInputRef.current =
      contentTypeInput instanceof HTMLInputElement ? contentTypeInput : null;
    fileInputRef.current = fileInput instanceof HTMLInputElement ? fileInput : null;

    const initialValue = textarea.value;
    const initialContentType =
      contentTypeInputRef.current?.value || 'text/markdown';
    setValue(initialValue);
    setContentType(initialContentType);
    renderValue(initialValue, initialContentType);

    textarea.style.display = 'none';
    if (fileInputRef.current) {
      fileInputRef.current.closest('.input')?.classList.add(classes.hiddenFallback);
    }

    const onFilesChanged = () => {
      setSelectedFiles(Array.from(fileInputRef.current?.files ?? []));
    };
    fileInputRef.current?.addEventListener('change', onFilesChanged);

    return () => {
      textarea.style.removeProperty('display');
      fileInputRef.current?.closest('.input')?.classList.remove(classes.hiddenFallback);
      fileInputRef.current?.removeEventListener('change', onFilesChanged);
    };
  }, [contentTypeId, fileInputId, renderValue, textareaId]);

  useEffect(() => {
    const previews = selectedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    return () => previews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const syncFallback = useCallback((nextValue) => {
    setValue(nextValue);
    if (textareaRef.current) textareaRef.current.value = nextValue;
  }, []);

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  }, []);

  const updateSuggestions = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || !selection.anchorNode || !editor.contains(selection.anchorNode)) {
      setEmojiSuggestions([]);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    const match = /(?:^|\s):([a-zA-Z0-9_+-]{2,})$/.exec(range.toString());
    if (!match) {
      setEmojiSuggestions([]);
      return;
    }

    const query = match[1].toLowerCase();
    setEmojiSuggestions(
      customEmojis
        .filter((emoji) => emoji.shortcode.toLowerCase().includes(query))
        .slice(0, 8),
    );
  }, [customEmojis]);

  const syncFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const caretOffset = getEditorSelectionOffset(editor);
    const nextValue =
      contentType === 'text/markdown'
        ? editorText(editor)
        : editorPlainText(editor);
    syncFallback(nextValue);
    updateSuggestions();

    if (!composingRef.current && /:[a-zA-Z0-9_+-]+:/.test(nextValue)) {
      requestAnimationFrame(() => renderValue(nextValue, contentType, caretOffset));
    }
  }, [contentType, renderValue, syncFallback, updateSuggestions]);

  const restoreSavedSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = savedRangeRef.current;
    if (!editor || !selection) return;

    editor.focus({ preventScroll: true });
    if (range && editor.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  const insertAtSelection = useCallback(
    (text) => {
      restoreSavedSelection();
      // execCommand preserves native undo/redo and IME behavior in contentEditable.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand('insertText', false, text);
      syncFromEditor();
      saveSelection();
    },
    [restoreSavedSelection, saveSelection, syncFromEditor],
  );

  const runCommand = useCallback(
    (command, argument = null) => {
      restoreSavedSelection();
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand(command, false, argument);
      syncFromEditor();
      saveSelection();
    },
    [restoreSavedSelection, saveSelection, syncFromEditor],
  );

  const handleLink = useCallback(() => {
    const url = window.prompt(intl.formatMessage(messages.linkUrl), 'https://');
    if (url) runCommand('createLink', url);
  }, [intl, runCommand]);

  const handleContentType = useCallback(
    (nextContentType) => {
      if (nextContentType === contentType) return;
      setContentType(nextContentType);
      if (contentTypeInputRef.current) contentTypeInputRef.current.value = nextContentType;
      renderValue(value, nextContentType);
    },
    [contentType, renderValue, value],
  );

  const handleEmojiSelect = useCallback(
    (emoji) => {
      const custom = customEmojiMap[emoji.id];
      const text = custom ? `:${emoji.id}:` : emoji.native;
      if (text) insertAtSelection(text);
      setPickerOpen(false);
      setEmojiSuggestions([]);
    },
    [customEmojiMap, insertAtSelection],
  );

  const handleSuggestion = useCallback(
    (shortcode) => {
      restoreSavedSelection();
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) {
        insertAtSelection(`:${shortcode}:`);
        return;
      }

      const before = node.textContent?.slice(0, range.startOffset) ?? '';
      const match = /:([a-zA-Z0-9_+-]{2,})$/.exec(before);
      if (!match) {
        insertAtSelection(`:${shortcode}:`);
        return;
      }

      range.setStart(node, range.startOffset - match[0].length);
      range.deleteContents();
      const replacement = document.createTextNode(`:${shortcode}:`);
      range.insertNode(replacement);
      range.setStartAfter(replacement);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      syncFromEditor();
      saveSelection();
      setEmojiSuggestions([]);
    },
    [insertAtSelection, restoreSavedSelection, saveSelection, syncFromEditor],
  );

  const mergeFilesIntoInput = useCallback(
    (files) => {
      const input = fileInputRef.current;
      if (!input || files.length === 0) return;

      if (typeof DataTransfer === 'undefined') {
        input.click();
        return;
      }

      const transfer = new DataTransfer();
      Array.from(input.files ?? []).forEach((file) => transfer.items.add(file));
      files.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    [],
  );

  const handlePaste = useCallback(
    (event) => {
      const files = Array.from(event.clipboardData.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      mergeFilesIntoInput(files);
    },
    [mergeFilesIntoInput],
  );

  const handleDrop = useCallback(
    (event) => {
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      mergeFilesIntoInput(files);
    },
    [mergeFilesIntoInput],
  );

  const handleKeyDown = useCallback((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.closest('form')?.requestSubmit();
    }
    if (event.key === 'Escape') {
      setPickerOpen(false);
      setEmojiSuggestions([]);
    }
  }, []);

  const visibleExistingMedia = existingMedia.filter(
    (media) => !removedMediaIds.has(media.id),
  );
  const mediaCount = visibleExistingMedia.length + selectedFiles.length;
  const mediaOverLimit = mediaCount > maxMedia;

  return (
    <div className={classes.root}>
      <div className={classes.modeRow}>
        <button
          type='button'
          className={contentType === 'text/markdown' ? classes.activeMode : classes.modeButton}
          onClick={() => handleContentType('text/markdown')}
        >
          {intl.formatMessage(messages.markdown)}
        </button>
        <button
          type='button'
          className={contentType === 'text/plain' ? classes.activeMode : classes.modeButton}
          onClick={() => handleContentType('text/plain')}
        >
          {intl.formatMessage(messages.plain)}
        </button>
      </div>

      {contentType === 'text/markdown' && (
        <div className={classes.toolbar} aria-label={intl.formatMessage(messages.formatting)}>
          <button type='button' title={intl.formatMessage(messages.bold)} onMouseDown={saveSelection} onClick={() => runCommand('bold')}><TextBIcon /></button>
          <button type='button' title={intl.formatMessage(messages.italic)} onMouseDown={saveSelection} onClick={() => runCommand('italic')}><TextItalicIcon /></button>
          <button type='button' title={intl.formatMessage(messages.underline)} onMouseDown={saveSelection} onClick={() => runCommand('underline')}><TextUnderlineIcon /></button>
          <button type='button' title={intl.formatMessage(messages.strike)} onMouseDown={saveSelection} onClick={() => runCommand('strikeThrough')}><TextStrikethroughIcon /></button>
          <button type='button' title={intl.formatMessage(messages.quote)} onMouseDown={saveSelection} onClick={() => runCommand('formatBlock', 'blockquote')}><QuotesIcon /></button>
          <button type='button' title={intl.formatMessage(messages.bullets)} onMouseDown={saveSelection} onClick={() => runCommand('insertUnorderedList')}><ListBulletsIcon /></button>
          <button type='button' title={intl.formatMessage(messages.numbers)} onMouseDown={saveSelection} onClick={() => runCommand('insertOrderedList')}><ListNumbersIcon /></button>
          <button type='button' title={intl.formatMessage(messages.code)} onMouseDown={saveSelection} onClick={() => runCommand('formatBlock', 'pre')}><CodeIcon /></button>
          <button type='button' title={intl.formatMessage(messages.link)} onMouseDown={saveSelection} onClick={handleLink}><LinkIcon /></button>
        </div>
      )}

      <div className={classes.editorShell}>
        <div
          ref={editorRef}
          className={classes.editor}
          contentEditable
          role='textbox'
          aria-multiline='true'
          data-placeholder={intl.formatMessage(messages.placeholder)}
          suppressContentEditableWarning
          onBlur={saveSelection}
          onCompositionEnd={() => { composingRef.current = false; syncFromEditor(); }}
          onCompositionStart={() => { composingRef.current = true; }}
          onDrop={handleDrop}
          onInput={syncFromEditor}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
        />

        {emojiSuggestions.length > 0 && (
          <div className={classes.suggestions}>
            {emojiSuggestions.map((emoji) => (
              <button
                key={emoji.shortcode}
                type='button'
                onMouseDown={(event) => { event.preventDefault(); saveSelection(); }}
                onClick={() => handleSuggestion(emoji.shortcode)}
              >
                <img src={emoji.static_url || emoji.url} alt='' />
                <span>:{emoji.shortcode}:</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={classes.actions}>
        <div className={classes.pickerAnchor}>
          <button
            type='button'
            className={classes.actionButton}
            title={intl.formatMessage(messages.emoji)}
            onMouseDown={saveSelection}
            onClick={() => setPickerOpen((open) => !open)}
          >
            <SmileyIcon />
            <span>{intl.formatMessage(messages.emoji)}</span>
          </button>

          {pickerOpen && (
            <div className={classes.picker}>
              <PickerRaw
                backgroundImageFn={backgroundImageFn}
                custom={pickerCustomEmojis}
                data={EmojiData}
                onSelect={handleEmojiSelect}
                set='twitter'
                sheetColumns={62}
                sheetRows={62}
                sheetSize={32}
                showPreview={false}
                title=''
              />
            </div>
          )}
        </div>

        <button
          type='button'
          className={classes.actionButton}
          disabled={mediaCount >= maxMedia}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon />
          <span>{intl.formatMessage(messages.media)}</span>
        </button>
      </div>

      {mediaOverLimit && (
        <p className={classes.error}>{intl.formatMessage(messages.mediaLimit, { count: maxMedia })}</p>
      )}

      {(existingMedia.length > 0 || selectedFiles.length > 0) && (
        <div className={classes.mediaGrid} aria-label={intl.formatMessage(messages.selectedMedia)}>
          {existingMedia.map((media) => {
            const removed = removedMediaIds.has(media.id);
            return (
              <div key={media.id} className={`${classes.mediaCard} ${removed ? classes.removed : ''}`}>
                {mediaPreview(media, { url: media.url, previewUrl: media.preview_url }, classes.mediaPreview)}
                <label>
                  <input
                    type='checkbox'
                    name='announcement[remove_media_attachment_ids][]'
                    value={media.id}
                    checked={removed}
                    onChange={(event) => {
                      setRemovedMediaIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(media.id);
                        else next.delete(media.id);
                        return next;
                      });
                    }}
                  />
                  {intl.formatMessage(messages.remove)}
                </label>
              </div>
            );
          })}

          {selectedFiles.map((file, index) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={`${file.name}-${file.lastModified}-${index}`} className={classes.mediaCard}>
                {mediaPreview({}, { type: file.type, url, previewUrl: url }, classes.mediaPreview)}
                <span className={classes.fileName}>{file.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

CommunicationEditor.propTypes = {
  textarea_id: PropTypes.string.isRequired,
  content_type_id: PropTypes.string.isRequired,
  file_input_id: PropTypes.string.isRequired,
  custom_emojis: PropTypes.arrayOf(
    PropTypes.shape({
      shortcode: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
      static_url: PropTypes.string.isRequired,
    }),
  ).isRequired,
  existing_media: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
      preview_url: PropTypes.string,
      description: PropTypes.string,
    }),
  ).isRequired,
  max_media: PropTypes.number.isRequired,
};

export default CommunicationEditor;
