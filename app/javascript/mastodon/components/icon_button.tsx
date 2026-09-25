import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import classNames from 'classnames';

import { usePrevious } from '../hooks/usePrevious';

import { AnimatedNumber } from './animated_number';
import type { IconProp } from './icon';
import { Icon } from './icon';

interface Props {
  className?: string;
  title: string;
  icon: string;
  iconComponent: IconProp;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  active?: boolean;
  expanded?: boolean;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
  disabled?: boolean;
  inverted?: boolean;
  animate?: boolean;
  overlay?: boolean;
  tabIndex?: number;
  counter?: number;
  href?: string;
  ariaHidden?: boolean;
  ariaControls?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      expanded,
      icon,
      iconComponent,
      inverted,
      title,
      counter,
      href,
      style,
      activeStyle,
      onClick,
      onKeyDown,
      onMouseDown,
      active = false,
      disabled = false,
      animate = false,
      overlay = false,
      tabIndex = 0,
      ariaHidden = false,
      ariaControls,
    },
    buttonRef,
  ) => {
    const [clickAnimation, setClickAnimation] = useState<
      'activate' | 'deactivate' | null
    >(null);
    const animationFrameRef = useRef<number | null>(null);
    const animationTimeoutRef = useRef<number | null>(null);

    useEffect(
      () => () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (animationTimeoutRef.current !== null) {
          window.clearTimeout(animationTimeoutRef.current);
        }
      },
      [],
    );

    const triggerClickAnimation = useCallback(() => {
      if (!animate) {
        return;
      }

      const animation = active ? 'deactivate' : 'activate';

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
      }

      // Remove the class first so consecutive clicks always restart the CSS animation.
      setClickAnimation(null);
      animationFrameRef.current = requestAnimationFrame(() => {
        setClickAnimation(animation);
        animationTimeoutRef.current = window.setTimeout(() => {
          setClickAnimation(null);
          animationTimeoutRef.current = null;
        }, 1000);
        animationFrameRef.current = null;
      });
    }, [active, animate]);

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(
      (e) => {
        e.preventDefault();

        if (!disabled) {
          triggerClickAnimation();
          onClick?.(e);
        }
      },
      [disabled, onClick, triggerClickAnimation],
    );

    const handleMouseDown: React.MouseEventHandler<HTMLButtonElement> =
      useCallback(
        (e) => {
          if (!disabled) {
            onMouseDown?.(e);
          }
        },
        [disabled, onMouseDown],
      );

    const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> =
      useCallback(
        (e) => {
          if (!disabled) {
            onKeyDown?.(e);
          }
        },
        [disabled, onKeyDown],
      );

    const buttonStyle = {
      ...style,
      ...(active ? activeStyle : {}),
    };

    const previousActive = usePrevious(active) ?? active;
    const shouldAnimate = animate && active !== previousActive;

    const classes = classNames(className, 'icon-button', {
      active,
      disabled,
      inverted,
      activate: (shouldAnimate && active) || clickAnimation === 'activate',
      deactivate:
        (shouldAnimate && !active) || clickAnimation === 'deactivate',
      overlayed: overlay,
      'icon-button--with-counter': typeof counter !== 'undefined',
    });

    let contents = (
      <>
        <Icon id={icon} icon={iconComponent} aria-hidden='true' />{' '}
        {typeof counter !== 'undefined' && (
          <span className='icon-button__counter'>
            <AnimatedNumber value={counter} />
          </span>
        )}
      </>
    );

    if (href != null) {
      contents = (
        <a href={href} target='_blank' rel='noopener noreferrer'>
          {contents}
        </a>
      );
    }

    return (
      <button
        type='button'
        aria-label={title}
        aria-expanded={expanded}
        aria-hidden={ariaHidden}
        aria-controls={ariaControls}
        title={title}
        className={classes}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        style={buttonStyle}
        tabIndex={tabIndex}
        disabled={disabled}
        ref={buttonRef}
      >
        {contents}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
