// Owned dropdown menu components on the Radix primitive (ADR 0010): Radix handles the arrow keys,
// Escape, clicks elsewhere, the focus given back and the menu semantics; the look is ours.
import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { HARD_SHADOW } from './board-styles.ts';
import { Icon } from './Icon.tsx';
import { FADES_IN_AND_OUT } from './open-close-motion.ts';

export const DropdownMenu = RadixDropdownMenu.Root;
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger;

/** An item under the pointer or the arrow keys turns to the accent, as a button does. */
const MENU_ITEM =
  'flex cursor-default items-center gap-2 rounded-md px-3 py-2.5 text-left outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground';

/** The menu's panel, below its trigger and lined up with its far end. */
export function DropdownMenuContent({ children }: { readonly children: ReactNode }) {
  return (
    <RadixDropdownMenu.Portal>
      <RadixDropdownMenu.Content
        side="bottom"
        align="end"
        sideOffset={8}
        className={`z-50 flex w-64 flex-col gap-1 rounded-lg border-2 border-border bg-panel p-2 text-sm text-foreground ${HARD_SHADOW} ${FADES_IN_AND_OUT}`}
      >
        {children}
      </RadixDropdownMenu.Content>
    </RadixDropdownMenu.Portal>
  );
}

export function DropdownMenuItem({
  onSelect,
  children,
}: {
  readonly onSelect: () => void;
  readonly children: ReactNode;
}) {
  return (
    <RadixDropdownMenu.Item className={MENU_ITEM} onSelect={onSelect}>
      {children}
    </RadixDropdownMenu.Item>
  );
}

/** An item that is on or off, ticked while on; choosing it keeps the menu open. */
export function DropdownMenuCheckboxItem({
  isChecked,
  onCheckedChange,
  children,
}: {
  readonly isChecked: boolean;
  readonly onCheckedChange: (isChecked: boolean) => void;
  readonly children: ReactNode;
}) {
  return (
    <RadixDropdownMenu.CheckboxItem
      className={MENU_ITEM}
      checked={isChecked}
      onCheckedChange={onCheckedChange}
      onSelect={(event) => event.preventDefault()}
    >
      <span className="grid size-4 place-items-center">
        <RadixDropdownMenu.ItemIndicator className="data-[state=checked]:animate-fade-in">
          <Icon name="check" />
        </RadixDropdownMenu.ItemIndicator>
      </span>
      {children}
    </RadixDropdownMenu.CheckboxItem>
  );
}
