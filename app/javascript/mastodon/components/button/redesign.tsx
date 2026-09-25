import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import classNames from 'classnames';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

import { CaretDownIcon } from '@phosphor-icons/react';

import { usePrevious } from '@/mastodon/hooks/usePrevious';

import { CircularProgress } from '../circular_progress';
import type { IconProp } from '../icon';
import { Icon } from '../icon';

import classes from './redesign.module.scss';

export const buttonClasses = classes;

interface ButtonPropsBase<As extends 'a' | 'button'> {
  size?: 'lg' | 'md' | 'sm' | 'xs';
  variant?: 'solid' | 'tonal' | 'ghost';
  color?: 'accent' | 'neutral' | 'destructive';
  onClick?: React.MouseEventHandler<
    As extends 'button' ? HTMLButtonElement : HTMLAnchorElement
  >;
  loading?: boolean;
  /**
   * Prevents visual highlight on the button when `aria-expanded`
   * or `aria-pressed` are used.
   */
  noActiveHighlight?: boolean;
  /**
   * Adds a negative margin to a button to align the text
   * with the starting edge of its parent.
   */
  clipPadding?: boolean;
  children: ReactNode;
}

type ButtonButtonProps = { as?: 'button' } & ButtonPropsBase<'button'> &
  Omit<React.ComponentPropsWithRef<'button'>, 'children'>;
type ButtonAnchorProps = { as: 'a' } & ButtonPropsBase<'a'> &
  Omit<React.ComponentPropsWithRef<'a'>, 'children'>;
type ButtonLinkProps = { as: 'link' } & ButtonPropsBase<'a'> &
  Omit<LinkProps, 'children'>;

type BaseButtonProps = ButtonButtonProps | ButtonAnchorProps | ButtonLinkProps;

const BaseButton: React.FC<BaseButtonProps> = ({
  size = 'md',
  variant = 'tonal',
  color = 'neutral',
  as: asComp = 'button',
  children,
  className,
  onClick,
  loading,
  clipPadding,
  noActiveHighlight,
  'aria-disabled': ariaDisabled,
  'aria-live': ariaLive,
  ...props
}) => {
  const disabled = 'disabled' in props ? props.disabled : false;
  const handleClick: React.MouseEventHandler<
    HTMLButtonElement & HTMLAnchorElement
  > = useCallback(
    (event) => {
      if (disabled || loading) {
        event.stopPropagation();
        event.preventDefault();
      } else if (onClick) {
        onClick(event);
      }
    },
    [loading, onClick, disabled],
  );

  let Comp: React.ElementType = asComp;
  if (asComp === 'link') {
    Comp = Link;
  }

  return (
    <Comp
      type='button'
      {...props}
      className={classNames(
        className,
        classes.base,
        classes[size],
        classes[color],
        classes[variant],
        clipPadding && classes.clipPadding,
        noActiveHighlight && classes.noActiveHighlight,
      )}
      onClick={handleClick}
      // Disabled buttons can't have focus, so we don't really
      // disable the button during loading
      disabled={disabled && !loading}
      aria-disabled={loading || ariaDisabled}
      // If the loading prop is used, announce label changes
      aria-live={ariaLive ?? (loading !== undefined ? 'polite' : undefined)}
    >
      {children}
    </Comp>
  );
};

export type ButtonProps = BaseButtonProps & {
  leadingIcon?: IconProp;
  trailingIcon?: IconProp;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  leadingIcon,
  trailingIcon,
  ...props
}) => (
  <BaseButton {...props}>
    {leadingIcon && !props.loading && (
      <Icon id='leading' icon={leadingIcon} className={classes.icon} />
    )}
    {props.loading && <LoadingIcon />}
    {children}
    {trailingIcon && (
      <Icon id='trailing' icon={trailingIcon} className={classes.icon} />
    )}
  </BaseButton>
);

export type IconButtonProps = BaseButtonProps & {
  icon: IconProp;
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  className,
  children,
  ...props
}) => (
  <BaseButton {...props} className={classNames(className, classes.iconOnly)}>
    {props.loading ? (
      <LoadingIcon />
    ) : (
      <Icon id='icon' icon={icon} className={classes.icon} />
    )}
    <span className='sr-only'>{children}</span>
  </BaseButton>
);

export const CaretIcon = (
  props: React.SVGProps<SVGSVGElement> & { title?: string },
) => (
  <CaretDownIcon
    {...props}
    className={classNames(props.className, classes.iconCustom)}
    weight='fill'
    size={12}
  />
);

const LoadingIcon: React.FC = () => (
  <CircularProgress
    size={10}
    strokeWidth={1}
    className={classes.loading}
    role='none'
  />
);

export const ToggleButton: React.FC<
  ButtonProps & { active?: boolean; animate?: boolean }
> = ({ active, animate = false, className, onClick, ...props }) => {
  const [clickAnimation, setClickAnimation] = useState<
    'activate' | 'deactivate' | null
  >(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const previousActive = usePrevious(active) ?? active;
  const shouldAnimate = animate && active !== previousActive;

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

  const handleClick: React.MouseEventHandler<
    HTMLButtonElement & HTMLAnchorElement
  > = useCallback(
    (event) => {
      triggerClickAnimation();
      onClick?.(event);
    },
    [onClick, triggerClickAnimation],
  );

  return (
    <Button
      aria-pressed={active}
      {...props}
      // Toggle buttons always have neutral until pressed.
      color='neutral'
      className={classNames(className, classes.toggle, {
        activate: (shouldAnimate && active) || clickAnimation === 'activate',
        deactivate:
          (shouldAnimate && !active) || clickAnimation === 'deactivate',
      })}
      onClick={handleClick}
    />
  );
};

export const ToggleIconButton: React.FC<
  IconButtonProps & { active?: boolean }
> = ({ active, className, ...props }) => (
  <IconButton
    aria-pressed={active}
    {...props}
    // Toggle buttons always have neutral until pressed.
    color='neutral'
    className={classNames(className, classes.toggle)}
  />
);
