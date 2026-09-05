import { useLayoutEffect } from 'react';
import type { FC } from 'react';

import type { EmojiProps, PickerProps } from 'emoji-mart';
import EmojiRaw from 'emoji-mart/dist-es/components/emoji/nimble-emoji';
import PickerRaw from 'emoji-mart/dist-es/components/picker/nimble-picker';

import { assetHost } from '@/mastodon/utils/config';

import { EMOJI_MODE_NATIVE } from './constants';
import EmojiData from './emoji_data.json';
import { useEmojiAppState } from './mode';
import { usePickerEmojis } from './picker';

const backgroundImageFnDefault = () => `${assetHost}/emoji/sheet_16_0.png`;

function preparePickerCustomEmojiImages(
  root: ParentNode,
  staticEmojiFallbacks: ReadonlyMap<string, string>,
) {
  for (const image of root.querySelectorAll<HTMLImageElement>(
    'img.lazy[data-src]',
  )) {
    const source = image.dataset.src;
    if (!source) {
      continue;
    }

    // emoji-mart-lazyload normally uses a transparent 1px placeholder until a
    // custom emoji reaches the viewport. Replace that placeholder with the
    // lightweight static thumbnail while preserving emoji-mart's lazy class and
    // data-src. Its own IntersectionObserver can then swap visible entries to
    // the preferred animated URL without downloading every animation at once.
    image.decoding = 'async';
    image.loading = 'lazy';
    image.src = staticEmojiFallbacks.get(source) ?? source;
  }
}

export const Picker: FC<PickerProps> = ({
  set = 'twitter',
  sheetSize = 32,
  sheetColumns = 62,
  sheetRows = 62,
  backgroundImageFn = backgroundImageFnDefault,
  ...props
}) => {
  const { mode } = useEmojiAppState();
  const { categories, emojis, staticEmojiFallbacks } = usePickerEmojis();

  useLayoutEffect(() => {
    const pickerRoots = Array.from(
      document.querySelectorAll<HTMLElement>('.emoji-mart'),
    );

    if (pickerRoots.length === 0) {
      return;
    }

    const hydrate = () => {
      for (const root of pickerRoots) {
        preparePickerCustomEmojiImages(root, staticEmojiFallbacks);
      }
    };

    hydrate();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    // emoji-mart adds some categories after its first render. Observe only the
    // picker subtree; feed avatars and media are deliberately outside this path.
    const observer = new MutationObserver(hydrate);
    for (const root of pickerRoots) {
      observer.observe(root, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [emojis, staticEmojiFallbacks]);

  return (
    <PickerRaw
      data={EmojiData}
      custom={emojis}
      include={categories}
      set={set}
      sheetSize={sheetSize}
      sheetColumns={sheetColumns}
      sheetRows={sheetRows}
      native={mode === EMOJI_MODE_NATIVE}
      backgroundImageFn={backgroundImageFn}
      {...props}
    />
  );
};

export const Emoji: FC<EmojiProps> = ({
  set = 'twitter',
  sheetSize = 32,
  sheetColumns = 62,
  sheetRows = 62,
  backgroundImageFn = backgroundImageFnDefault,
  ...props
}) => {
  const { mode } = useEmojiAppState();
  return (
    <EmojiRaw
      backgroundImageFn={backgroundImageFn}
      data={EmojiData}
      native={mode === EMOJI_MODE_NATIVE}
      set={set}
      sheetColumns={sheetColumns}
      sheetRows={sheetRows}
      sheetSize={sheetSize}
      skin={1}
      tooltip={false}
      forceSize={false}
      {...{ useButton: true }}
      {...props}
    />
  );
};
