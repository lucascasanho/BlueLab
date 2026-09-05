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

function eagerLoadPickerCustomEmojiImages(root: ParentNode) {
  for (const image of root.querySelectorAll<HTMLImageElement>(
    'img.lazy[data-src]',
  )) {
    const source = image.dataset.src;
    if (!source) {
      continue;
    }

    // emoji-mart-lazyload intentionally leaves a transparent placeholder until
    // IntersectionObserver sees each row. The application already warms these
    // assets after the feed, so point every picker image at its real URL as
    // soon as the picker DOM exists instead of waiting for scroll position.
    image.loading = 'eager';
    image.setAttribute('fetchpriority', 'high');
    image.src = source;
    image.classList.remove('lazy');
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
  const { categories, emojis } = usePickerEmojis();

  useLayoutEffect(() => {
    const pickerRoots = Array.from(
      document.querySelectorAll<HTMLElement>('.emoji-mart'),
    );

    if (pickerRoots.length === 0) {
      return;
    }

    const hydrate = () => {
      for (const root of pickerRoots) {
        eagerLoadPickerCustomEmojiImages(root);
      }
    };

    hydrate();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    // emoji-mart adds the remaining categories shortly after its first render.
    // Observe only picker roots, never the feed, so this cannot alter avatar or
    // media loading behaviour elsewhere in the interface.
    const observer = new MutationObserver(hydrate);
    for (const root of pickerRoots) {
      observer.observe(root, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [emojis]);

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
