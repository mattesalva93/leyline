import { previewPrint, type AllocationChoice, type Lang, type ResolvedLine } from '@mtg-suite/core';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from './LanguagePicker.tsx';
import { contentWidthOf, printPageSize } from './print-picker-geometry.ts';
import { PrintPicker } from './PrintPicker.tsx';
import { PrintWarningNote } from './PrintWarningNote.tsx';
import { NORMAL_IMAGE } from './scryfall-image-sizes.ts';
import { usePrintPages } from './use-print-pages.ts';

interface LinePanelProps {
  /** The line being edited; `null` keeps the panel closed. */
  readonly line: ResolvedLine | null;
  readonly onLanguageChange: (lang: Lang) => void;
  readonly onQuantityChange: (quantity: number) => void;
  /** Called with the allocations the user set in the print picker. */
  readonly onAllocationChoice: (allocations: AllocationChoice) => void;
  readonly onClose: () => void;
}

/** The panel that slides up from the bottom when a card is tapped: the settings of that line. */
export function LinePanel({
  line,
  onLanguageChange,
  onQuantityChange,
  onAllocationChoice,
  onClose,
}: LinePanelProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPrintPickerOpen, setIsPrintPickerOpen] = useState(false);
  const isOpen = line !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog?.open) dialog?.showModal();
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

  // Called after the effect above, so its first request measures the panel already open.
  const printPages = usePrintPages(line?.card.oracleId ?? null, line?.lang ?? 'en', () => {
    const dialog = dialogRef.current;
    const gridWidth = dialog?.open ? contentWidthOf(dialog) : window.innerWidth;
    return printPageSize(gridWidth, window.innerHeight);
  });

  function closePanel() {
    setIsPrintPickerOpen(false);
    onClose();
  }

  const shownPrint = line && previewPrint(line);
  const frontFace = shownPrint?.faces[0];
  const printCount = printPages.total;
  return (
    <dialog
      ref={dialogRef}
      className="panel"
      aria-labelledby="panel-title"
      onClose={closePanel}
      // A click on the dimmed backdrop lands on the dialog itself, not on its content.
      onClick={(event) => event.target === event.currentTarget && closePanel()}
    >
      {line && isPrintPickerOpen && (
        <PrintPicker
          line={line}
          printPages={printPages}
          onAllocationChoice={onAllocationChoice}
          onPrintEveryCopy={(allocations) => {
            onAllocationChoice(allocations);
            setIsPrintPickerOpen(false);
          }}
          onBack={() => setIsPrintPickerOpen(false)}
        />
      )}
      {line && !isPrintPickerOpen && (
        <div className="panel__content">
          <div className="panel__header">
            {frontFace && (
              <img
                className="panel__image"
                src={frontFace.imageUris.normal}
                alt={t('line.imageAlt', { name: frontFace.name })}
                width={NORMAL_IMAGE.width}
                height={NORMAL_IMAGE.height}
              />
            )}
            <h2 id="panel-title">{line.card.name}</h2>
          </div>
          <LanguagePicker
            label={t('panel.lang')}
            selectedLang={line.lang}
            onChange={onLanguageChange}
          />
          <PrintWarningNote line={line} onSwitchLineToEnglish={() => onLanguageChange('en')} />
          <button
            type="button"
            className="button--secondary panel__prints"
            disabled={printCount === null || printCount <= 1}
            onClick={() => setIsPrintPickerOpen(true)}
          >
            {t('panel.prints')}
            {printCount !== null && (
              <span className="badge" aria-label={t('panel.printCount', { count: printCount })}>
                {printCount}
              </span>
            )}
          </button>
          <fieldset className="quantity">
            <legend>{t('panel.quantity')}</legend>
            <button
              type="button"
              aria-label={t('panel.decrease')}
              disabled={line.quantity <= 1}
              onClick={() => onQuantityChange(line.quantity - 1)}
            >
              {t('panel.minus')}
            </button>
            <output aria-live="polite">{line.quantity}</output>
            <button
              type="button"
              aria-label={t('panel.increase')}
              onClick={() => onQuantityChange(line.quantity + 1)}
            >
              {t('panel.plus')}
            </button>
          </fieldset>
          <button type="button" className="panel__close" onClick={closePanel}>
            {t('panel.close')}
          </button>
        </div>
      )}
    </dialog>
  );
}
