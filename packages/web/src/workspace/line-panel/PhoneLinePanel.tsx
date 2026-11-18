import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PRINT_PICKER_SCROLL_ROOT_PROPS } from '../print-picker/print-picker-marks.ts';
import { SYMBOL_BUTTON } from '../../ui/board-styles.ts';
import { Dialog, DialogClose, FullScreenPanelContent } from '../../ui/Dialog.tsx';

/**
 * On a phone, the panel of the tapped tile's line, over the whole screen: the content the
 * inspector shows on a wide screen, under a header that stays put while it scrolls. Closing it
 * lets go of the tile.
 */
export function PhoneLinePanel({
  title,
  heading,
  onClose,
  onClosed,
  children,
}: {
  readonly title: string;
  /** What the header names the panel by, beside its close button. */
  readonly heading: ReactNode;
  readonly onClose: () => void;
  /** Once the panel has gone, to put the focus where it belongs: no button opened the panel. */
  readonly onClosed: () => void;
  /** What the panel shows; `null` keeps it closed. */
  readonly children: ReactNode;
}) {
  const { t } = useTranslation();
  const isOpen = children !== null;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => open || onClose()}>
      {isOpen && (
        <FullScreenPanelContent
          ariaLabel={title}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onClosed();
          }}
        >
          {/* Outside the scrolling body, so nothing it brings into view goes under the header. */}
          <header className="flex shrink-0 items-center gap-3 border-b-2 border-border px-4 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">{heading}</div>
            <DialogClose className={`${SYMBOL_BUTTON} shrink-0`} aria-label={t('panel.close')}>
              {t('panel.closeSymbol')}
            </DialogClose>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4" {...PRINT_PICKER_SCROLL_ROOT_PROPS}>
            {children}
          </div>
        </FullScreenPanelContent>
      )}
    </Dialog>
  );
}
