import type { Lang, ResolvedLine } from '@mtg-suite/core';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from './LanguagePicker.tsx';
import { PrintWarningNote } from './PrintWarningNote.tsx';

interface LineSheetProps {
  /** The line being edited; `null` keeps the panel closed. */
  readonly line: ResolvedLine | null;
  readonly onLangChange: (lang: Lang) => void;
  readonly onQuantityChange: (quantity: number) => void;
  readonly onClose: () => void;
}

/** The bottom sheet a tap on a card opens: the settings of that one line. */
export function LineSheet({ line, onLangChange, onQuantityChange, onClose }: LineSheetProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const open = line !== null;

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  const face = line?.defaultPrint?.faces[0];
  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself, not on its content.
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {line && (
        <div className="sheet__content">
          <div className="sheet__header">
            {face && (
              <img
                className="sheet__image"
                src={face.imageUris.normal}
                alt={t('line.imageAlt', { name: face.name })}
                width={488}
                height={680}
              />
            )}
            <h2 id="sheet-title">{line.card.name}</h2>
          </div>
          <LanguagePicker label={t('sheet.lang')} value={line.lang} onChange={onLangChange} />
          <PrintWarningNote line={line} onUseEnglish={() => onLangChange('en')} />
          <fieldset className="quantity">
            <legend>{t('sheet.quantity')}</legend>
            <button
              type="button"
              aria-label={t('sheet.decrease')}
              disabled={line.quantity <= 1}
              onClick={() => onQuantityChange(line.quantity - 1)}
            >
              {t('sheet.minus')}
            </button>
            <output aria-live="polite">{line.quantity}</output>
            <button
              type="button"
              aria-label={t('sheet.increase')}
              onClick={() => onQuantityChange(line.quantity + 1)}
            >
              {t('sheet.plus')}
            </button>
          </fieldset>
          <button type="button" className="sheet__close" onClick={onClose}>
            {t('sheet.close')}
          </button>
        </div>
      )}
    </dialog>
  );
}
