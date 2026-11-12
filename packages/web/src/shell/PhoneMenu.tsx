import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTrigger, SideDrawerContent } from '../ui/Dialog.tsx';
import { Icon } from '../ui/Icon.tsx';
import type { ShellArea } from './AppShell.tsx';
import { AreaNav } from './AreaNav.tsx';

/**
 * The menu button of a phone's top bar and the drawer it opens: the areas, then whatever the
 * top bar has no room for (`children`). Picking an area closes it.
 */
export function PhoneMenu({
  areas,
  className = '',
  children,
}: {
  readonly areas: readonly ShellArea[];
  readonly className?: string;
  readonly children?: (closeMenu: () => void) => ReactNode;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        aria-label={t('shell.menu')}
        className={`grid size-10 place-items-center ${className}`}
      >
        <Icon name="menu" className="size-5" />
      </DialogTrigger>
      <SideDrawerContent ariaLabel={t('shell.menu')}>
        <AreaNav
          areas={areas}
          placement="menu"
          className="flex flex-col gap-1"
          onNavigate={closeMenu}
        />
        <hr className="my-2 border-border" />
        {children?.(closeMenu)}
      </SideDrawerContent>
    </Dialog>
  );
}
