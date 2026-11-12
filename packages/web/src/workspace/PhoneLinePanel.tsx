import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PRINT_PICKER_SCROLL_ROOT_PROPS } from '../PrintPicker.tsx';
import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
import { BottomPanelContent, Dialog, DialogClose } from '../ui/Dialog.tsx';

/**
 * On a phone, the panel of the tapped tile's line, risen from the bottom over the grid: the
 * content the inspector shows on a wide screen. Closing it lets go of the tile.
 */
export function PhoneLinePanel({
  title,
  onClose,
  children,
}: {
  readonly title: string;
  readonly onClose: () => void;
  /** What the panel shows; `null` keeps it closed. */
  readonly children: ReactNode;
}) {
  const { t } = useTranslation();
  const isOpen = children !== null;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => open || onClose()}>
      {isOpen && (
        <BottomPanelContent ariaLabel={title}>
          <div className="min-h-0 flex-1 overflow-y-auto p-4" {...PRINT_PICKER_SCROLL_ROOT_PROPS}>
            {children}
          </div>
          <div className="shrink-0 border-t-2 border-border p-3">
            <DialogClose className={`${PRIMARY_BUTTON} w-full justify-center`}>
              {t('panel.close')}
            </DialogClose>
          </div>
        </BottomPanelContent>
      )}
    </Dialog>
  );
}
