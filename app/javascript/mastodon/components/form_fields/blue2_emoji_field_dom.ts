const BROWSER_PLACEHOLDER_TEXT = /^[\u00a0\u200b\ufeff]+$/u;

export function clearEmptyProfileEmojiEditorPlaceholder(
  editor: HTMLElement,
  inputValue: string,
) {
  if (inputValue !== '' || editor.childNodes.length === 0) return false;

  const text = editor.textContent;
  if (text !== '' && !BROWSER_PLACEHOLDER_TEXT.test(text)) return false;

  editor.replaceChildren();
  return true;
}
