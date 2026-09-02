/**
 * Handle clicks that occur outside of the element(s) provided in the first parameter
 */

import type { RefObject } from 'react';
import { useEffect, useEffectEvent } from 'react';

type PlainElement = Element | null;
type ElementOrRef = PlainElement | RefObject<PlainElement>;

export function useOnClickOutside(
  excludedElement: ElementOrRef | ElementOrRef[],
  onClick: (e: MouseEvent) => void,
  enabled = true,
) {
  const handleClickOutside = useEffectEvent((event: MouseEvent) => {
    const excludedRefs = Array.isArray(excludedElement)
      ? excludedElement
      : [excludedElement];

    for (const ref of excludedRefs) {
      const excludedElement = ref instanceof Element ? ref : ref?.current;

      // Keep the popover open only when the click itself is inside it. This
      // lets a non-focusable area close a picker even when its trigger is
      // still focused.
      if (
        excludedElement &&
        (excludedElement === event.target ||
          excludedElement.contains(event.target as Node))
      ) {
        return;
      }
    }

    onClick(event);
  });

  useEffect(() => {
    if (!enabled) {
      return () => null;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      handleClickOutside(event as MouseEvent);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [enabled, handleClickOutside]);
}
