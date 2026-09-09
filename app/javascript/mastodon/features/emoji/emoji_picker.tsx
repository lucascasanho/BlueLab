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

export function preparePickerCustomEmojiImage(
  image: HTMLImageElement,
  staticEmojiFallbacks: ReadonlyMap<string, string>,
) {
  const source = image.dataset.src;
  if (!source || !image.classList.contains('lazy')) {
    return false;
  }

  // Keep emoji-mart-lazyload in control of the final animated upgrade. BlueLab
  // only supplies a lightweight visible placeholder for an emoji that is
  // already in, or just about to enter, the picker viewport.
  image.decoding = 'async';
  image.loading = 'eager';
  image.removeAttribute('fetchpriority');

  const placeholder = staticEmojiFallbacks.get(source) ?? source;
  if (image.getAttribute('src') !== placeholder) {
    image.src = placeholder;
  }

  return true;
}

export function preparePickerCustomEmojiImages(
  root: ParentNode,
  staticEmojiFallbacks: ReadonlyMap<string, string>,
) {
  for (const image of root.querySelectorAll<HTMLImageElement>(
    'img.lazy[data-src]',
  )) {
    preparePickerCustomEmojiImage(image, staticEmojiFallbacks);
  }
}

const observePickerCustomEmojiImages = (
  root: ParentNode,
  observer: IntersectionObserver,
  observedImages: WeakSet<HTMLImageElement>,
) => {
  const observe = (image: HTMLImageElement) => {
    if (
      observedImages.has(image) ||
      !image.classList.contains('lazy') ||
      !image.dataset.src
    ) {
      return;
    }

    observedImages.add(image);
    observer.observe(image);
  };

  if (root instanceof HTMLImageElement) {
    observe(root);
  }

  for (const image of root.querySelectorAll<HTMLImageElement>(
    'img.lazy[data-src]',
  )) {
    observe(image);
  }
};

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

    // IntersectionObserver is the normal path. It prevents a picker containing
    // hundreds or thousands of custom emojis from eagerly starting every image
    // request at once, which can starve the visible rows on mobile browsers.
    if (typeof IntersectionObserver === 'undefined') {
      for (const root of pickerRoots) {
        preparePickerCustomEmojiImages(root, staticEmojiFallbacks);
      }
      return;
    }

    const intersectionObservers: IntersectionObserver[] = [];
    const mutationObservers: MutationObserver[] = [];

    for (const root of pickerRoots) {
      const observedImages = new WeakSet<HTMLImageElement>();
      const scrollRoot = root.querySelector<HTMLElement>('.emoji-mart-scroll');

      const imageObserver = new IntersectionObserver(
        (entries, observer) => {
          for (const entry of entries) {
            if (
              !entry.isIntersecting ||
              !(entry.target instanceof HTMLImageElement)
            ) {
              continue;
            }

            const image = entry.target;
            observer.unobserve(image);

            // emoji-mart may have upgraded the image first. Its observer removes
            // the lazy class, so never overwrite an already-loaded animated URL.
            preparePickerCustomEmojiImage(image, staticEmojiFallbacks);
          }
        },
        {
          root: scrollRoot ?? null,
          rootMargin: '96px 0px',
        },
      );

      intersectionObservers.push(imageObserver);
      observePickerCustomEmojiImages(root, imageObserver, observedImages);

      if (typeof MutationObserver !== 'undefined') {
        const mutationObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) {
                observePickerCustomEmojiImages(
                  node,
                  imageObserver,
                  observedImages,
                );
              }
            }
          }
        });

        mutationObserver.observe(root, { childList: true, subtree: true });
        mutationObservers.push(mutationObserver);
      }
    }

    return () => {
      for (const observer of intersectionObservers) {
        observer.disconnect();
      }
      for (const observer of mutationObservers) {
        observer.disconnect();
      }
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
