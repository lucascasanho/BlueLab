import { useLayoutEffect, useRef } from 'react';

import classNames from 'classnames';

import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import { useMergedRefs } from '@/mastodon/hooks/useMergedRefs';
import type { PolymorphicProps } from '@/types/polymorphic';

import { BottomSheet } from '../bottom_sheet';
import { Popover } from '../popover';
import type { PopoverProps } from '../popover';

import classes from './styles.module.scss';

export type MenuCardProps<As extends React.ElementType> = PolymorphicProps<
  {
    children: React.ReactNode;
    className?: string;
    elevation?: 1 | 2;
    maxWidth?: number | string;
    style?: React.CSSProperties;
  },
  As
>;

export const MenuCard = <As extends React.ElementType = 'div'>({
  as: asComp,
  children,
  className,
  elevation = 1,
  maxWidth,
  style,
  // Upstream #40448 uses the native Popover API when available so menus are
  // promoted to the browser top layer instead of fighting drawer stacking and
  // clipping contexts. Passing popover={undefined} still opts out explicitly.
  popover = 'manual',
  ...props
}: MenuCardProps<As>) => {
  const Component = asComp ?? 'div';
  const cardRef = useRef<HTMLDivElement>(null);
  const nativePopover =
    popover === 'manual' && isPopoverAPISupported() ? popover : undefined;

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (nativePopover !== 'manual' || !card) return;

    card.showPopover();

    return () => {
      card.hidePopover();
    };
  }, [nativePopover]);

  return (
    <Component
      {...props}
      ref={useMergedRefs(props.ref, cardRef)}
      popover={nativePopover}
      className={classNames(className, classes.card)}
      data-elevation={elevation}
      style={
        {
          '--_max-card-width':
            typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          ...style,
        } as React.CSSProperties
      }
    >
      {children}
    </Component>
  );
};

function isPopoverAPISupported() {
  return (
    typeof HTMLElement !== 'undefined' &&
    typeof CSS !== 'undefined' &&
    'popover' in HTMLElement.prototype &&
    typeof HTMLElement.prototype.showPopover === 'function' &&
    typeof HTMLElement.prototype.hidePopover === 'function' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:popover-open)')
  );
}

export type PopoverMenuCardProps<As extends React.ElementType> =
  MenuCardProps<As> &
    Omit<PopoverProps, 'children'> & {
      mobilePresentation?: 'bottom-sheet' | 'popover';
    };

export const PopoverMenuCard = <As extends React.ElementType>({
  isOpen,
  onClose,
  reference,
  popoverElement,
  container,
  placement,
  offset = 4,
  flip,
  strategy,
  matchReferenceWidth,
  closeOnClickOutside,
  mobilePresentation = 'bottom-sheet',
  children,
  className,
  ...props
}: PopoverMenuCardProps<As>) => {
  const isMobile = useBreakpoint('openable');

  // BlueLab's account card deliberately keeps an anchored popover on mobile;
  // other Mastodon menus retain the upstream bottom-sheet presentation.
  if (isMobile && isOpen && mobilePresentation === 'bottom-sheet') {
    return (
      <BottomSheet {...props} onClose={onClose}>
        {children}
      </BottomSheet>
    );
  }

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      reference={reference}
      popoverElement={popoverElement}
      container={container}
      placement={placement}
      offset={offset}
      flip={flip}
      strategy={strategy}
      matchReferenceWidth={matchReferenceWidth}
      closeOnClickOutside={closeOnClickOutside}
    >
      {({ props: popoverChildProps }) => (
        <MenuCard
          {...popoverChildProps}
          {...(props as React.ComponentPropsWithoutRef<As>)}
          className={classNames(
            className,
            props.maxWidth && classes.popoverCard,
          )}
        >
          {children}
        </MenuCard>
      )}
    </Popover>
  );
};
