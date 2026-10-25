import {
  createContext,
  use,
  useCallback,
  useId,
  useMemo,
  useState,
} from 'react';

import { mergeProps } from '@react-aria/utils';

import { useBreakpoint } from '@/mastodon/features/ui/hooks/useBreakpoint';
import type { PolymorphicProps } from '@/types/polymorphic';

import { Button } from '../button/redesign';
import { normalizeKey } from '../hotkeys/utils';

import { PopoverMenuCard } from './card';
import type { PopoverMenuCardProps } from './card';
import classes from './styles.module.scss';

export const menuItemClass = classes.item;

export {
  MenuItemDivider,
  MenuItemGroup,
  MenuItem,
  MenuItemLink,
  MenuItemRadio,
  MenuItemCheckbox,
} from './items';
export { LegacyDropdownMenuItems } from './legacy_dropdown_items';

interface PopoverState {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  popover: HTMLDivElement | null;
  reference: HTMLButtonElement | null;
}

interface MenuTriggerContextProps {
  ref: (button: HTMLButtonElement | null) => void;
  id: string;
  'aria-haspopup'?: 'menu';
  'aria-expanded': boolean;
  'aria-controls'?: string;
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

interface MenuListContextProps {
  ref: (list: HTMLDivElement | null) => void;
  role?: 'menu'; // only for menus of type === 'actions'
  tabIndex: -1;
  id: string;
  'aria-labelledby': string;
  onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
}

type MenuType = 'actions' | 'navigation';

interface MenuState {
  type: MenuType;
  popover: PopoverState;
  menuTriggerProps: MenuTriggerContextProps;
  menuListProps: MenuListContextProps;
}

const MenuContext = createContext<MenuState | null>(null);

export function useMenuContext(): MenuState {
  const context = use(MenuContext);

  if (!context) {
    throw new Error('useMenuContext must be used within a <Menu> component');
  }

  return context;
}

export function getAllMenuItems(menuListElement: HTMLDivElement) {
  return Array.from(
    menuListElement.querySelectorAll<HTMLElement>(
      ':scope [data-menu-item]:not([disabled])',
    ),
  );
}

interface MenuProps {
  /**
   * Set the type according the the menu's use case for accessible markup.
   * Use 'navigation' for menus that are primarily used for site navigation.
   * Note that navigation menus don't support `MenuItemRadio` and `MenuItemCheckbox`.
   */
  type?: MenuType;
  /** Run before opening. Returning false prevents the menu from opening. */
  onOpen?: (() => void) | (() => boolean);
  /** Run before closing. Returning false prevents the menu from closing. */
  onClose?: (() => void) | (() => boolean);
  children: React.ReactNode;
  /** Don't set initial focus on the first menu item when opening the menu. */
  noFocus?: boolean;
}

export const Menu: React.FC<MenuProps> = ({
  type = 'actions',
  onOpen,
  onClose,
  children,
  noFocus,
}) => {
  const isMobile = useBreakpoint('openable');
  const theme =
    typeof document !== 'undefined' ? document.body.dataset.theme : undefined;
  const isVanillaTheme = !theme || theme === 'default' || theme === 'vanilla';
  const skipInitialFocus = noFocus || (isMobile && isVanillaTheme);

  const id = useId();
  const triggerId = `${id}-trigger`;
  const listId = `${id}-list`;
  const [triggerElement, setTriggerElement] =
    useState<HTMLButtonElement | null>(null);
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null);

  const mountListElement = useCallback(
    (element: HTMLDivElement | null) => {
      setListElement(element);

      if (element && type === 'actions' && !skipInitialFocus) {
        const menuItems = getAllMenuItems(element);
        const elementToFocus = menuItems[0] ?? element;
        elementToFocus.focus({ preventScroll: true });
      }
    },
    [skipInitialFocus, type],
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = useCallback(() => {
    const shouldOpen = onOpen?.();
    if (shouldOpen === false) return;

    setIsMenuOpen(true);
  }, [onOpen]);

  const closeMenu = useCallback(() => {
    const shouldClose = onClose?.();
    if (shouldClose === false) return;

    setIsMenuOpen(false);
    if (listElement?.contains(document.activeElement)) {
      triggerElement?.focus({ preventScroll: true });
    }
  }, [listElement, triggerElement, onClose]);

  const toggleMenu = isMenuOpen ? closeMenu : openMenu;

  const handleTriggerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!e.defaultPrevented) {
        toggleMenu();
      }
    },
    [toggleMenu],
  );

  const handleMenuNavigation = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!listElement) {
        if (event.code === 'ArrowDown') {
          openMenu();
          event.preventDefault();
        }
        return;
      }

      const menuItems = getAllMenuItems(listElement);
      if (menuItems.length === 0) return;

      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = menuItems.indexOf(activeElement);

      switch (event.code) {
        case 'ArrowDown': {
          event.preventDefault();
          if (isMenuOpen) {
            const nextIndex =
              currentIndex === -1 ? 0 : (currentIndex + 1) % menuItems.length;
            menuItems[nextIndex]?.focus();
          } else {
            openMenu();
          }
          break;
        }

        case 'ArrowUp': {
          event.preventDefault();
          const prevIndex =
            currentIndex === -1
              ? menuItems.length - 1
              : (currentIndex - 1 + menuItems.length) % menuItems.length;
          menuItems[prevIndex]?.focus();
          break;
        }

        case 'Home': {
          event.preventDefault();
          menuItems[0]?.focus();
          break;
        }

        case 'End': {
          event.preventDefault();
          menuItems[menuItems.length - 1]?.focus();
          break;
        }

        case 'Escape': {
          event.preventDefault();
          closeMenu();
          break;
        }
      }
    },
    [closeMenu, isMenuOpen, listElement, openMenu],
  );

  const contextValue = useMemo(() => {
    const popover: PopoverState = {
      isMenuOpen,
      openMenu,
      closeMenu,
      toggleMenu,
      reference: triggerElement,
      popover: listElement,
    };

    const role = type === 'actions' ? 'menu' : undefined;

    const menuTriggerProps: MenuTriggerContextProps = {
      id: triggerId,
      ref: setTriggerElement,
      'aria-haspopup': role,
      'aria-expanded': isMenuOpen,
      'aria-controls': listElement ? listId : undefined,
      onClick: handleTriggerClick,
      onKeyDown: handleMenuNavigation,
    };

    const menuListProps: MenuListContextProps = {
      id: listId,
      ref: mountListElement,
      'aria-labelledby': triggerId,
      role,
      tabIndex: -1,
      onKeyDown: handleMenuNavigation,
    };

    return {
      type,
      popover,
      menuTriggerProps,
      menuListProps,
    };
  }, [
    isMenuOpen,
    openMenu,
    closeMenu,
    toggleMenu,
    triggerElement,
    listElement,
    type,
    triggerId,
    listId,
    handleTriggerClick,
    handleMenuNavigation,
    mountListElement,
  ]);

  return <MenuContext value={contextValue}>{children}</MenuContext>;
};

export const MenuTrigger = <As extends React.ElementType = typeof Button>({
  as: asComp,
  children,
  ...props
}: PolymorphicProps<React.PropsWithChildren, As>) => {
  const Component = asComp ?? Button;
  const { menuTriggerProps } = useMenuContext();
  const mergedProps = mergeProps(
    props as React.ComponentPropsWithoutRef<As>,
    menuTriggerProps,
  ) as React.ComponentPropsWithoutRef<As> & typeof menuTriggerProps;

  return <Component {...mergedProps}>{children}</Component>;
};

export const MenuTriggerText = ({
  children,
  ...props
}: React.ComponentPropsWithRef<'a'>) => {
  const {
    menuTriggerProps: {
      onClick: onMenuClick,
      onKeyDown: onMenuKeyDown,
      ...menuTriggerProps
    },
  } = useMenuContext();

  const onClick: React.MouseEventHandler = useCallback(
    (event) => {
      if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        onMenuClick(event as React.MouseEvent<HTMLButtonElement>);
      }
    },
    [onMenuClick],
  );
  const onKeyDown: React.KeyboardEventHandler = useCallback(
    (event) => {
      if (normalizeKey(event.key) === 'space') {
        event.preventDefault();
        onMenuKeyDown(event as React.KeyboardEvent<HTMLButtonElement>);
      }
    },
    [onMenuKeyDown],
  );

  return (
    <a
      role='button'
      tabIndex={0}
      {...mergeProps(props, menuTriggerProps)}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </a>
  );
};

export type MenuListProps<As extends React.ElementType> = Omit<
  PopoverMenuCardProps<As>,
  'isOpen' | 'onClose' | 'reference' | 'popoverElement'
> & {
  /**
   * Compatibility switch for BlueLab call sites that previously needed a
   * document-body portal to escape drawer clipping. Native popover top-layer
   * rendering now handles clipping when supported; the portal remains as the
   * fallback for older browsers.
   */
  portal?: boolean;
};

export const MenuList = <As extends React.ElementType = 'div'>({
  children,
  portal = false,
  ...props
}: MenuListProps<As>) => {
  const { popover, menuListProps, type } = useMenuContext();

  return (
    <PopoverMenuCard
      isOpen={popover.isMenuOpen}
      onClose={popover.closeMenu}
      reference={popover.reference}
      popoverElement={popover.popover}
      container={portal ? undefined : null}
      {...(props as React.ComponentPropsWithoutRef<As>)}
      {...menuListProps}
    >
      {type === 'navigation' ? <ul>{children}</ul> : children}
    </PopoverMenuCard>
  );
};
