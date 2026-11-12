import { useTranslation } from 'react-i18next';
import { PRINT_PICKER_SCROLL_ROOT_PROPS } from '../PrintPicker.tsx';
import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
import { BottomPanelContent, Dialog, DialogClose } from '../ui/Dialog.tsx';
import type { Generator } from '../use-generator.ts';
import { SelectedLinePanel, type PanelLine } from './SelectedLinePanel.tsx';

/**
 * On a phone, the panel of the tapped tile's line, risen from the bottom over the grid: the
 * content the inspector shows on a wide screen. Closing it lets go of the tile.
 */
export function PhoneLinePanel({
  generator,
  panelLine,
  onClose,
}: {
  readonly generator: Generator;
  /** The line whose panel is open; `null` keeps the panel closed. */
  readonly panelLine: PanelLine | null;
  readonly onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={panelLine !== null} onOpenChange={(isOpen) => isOpen || onClose()}>
      {panelLine && (
        <BottomPanelContent ariaLabel={t('workspace.inspector.line')}>
          <div className="min-h-0 flex-1 overflow-y-auto p-4" {...PRINT_PICKER_SCROLL_ROOT_PROPS}>
            <SelectedLinePanel generator={generator} panelLine={panelLine} />
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
