import type { Lang, ResolvedLine } from '@mtg-suite/core';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from './LanguagePicker.tsx';
import { PrintWarningNote } from './PrintWarningNote.tsx';

interface LinePanelProps {
  /** The line being edited; `null` keeps the panel closed. */
  readonly line: ResolvedLine | null;
  readonly onLanguageChange: (lang: Lang) => void;
  readonly onQuantityChange: (quantity: number) => void;
  readonly onClose: () => void;
}

/** The panel that slides up from the bottom when a card is tapped: the settings of that line. */
export function LinePanel({ line, onLanguageChange, onQuantityChange, onClose }: LinePanelProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = line !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog?.open) dialog?.showModal();
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

  const frontFace = line?.defaultPrint?.faces[0];
  return (
    <dialog
      ref={dialogRef}
      className="panel"
      aria-labelledby="panel-title"
      onClose={onClose}
      // A click on the dimmed backdrop lands on the dialog itself, not on its content.
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {line && (
        <div className="panel__content">
          <div className="panel__header">
            {frontFace && (
              <img
                className="panel__image"
                src={frontFace.imageUris.normal}
                alt={t('line.imageAlt', { name: frontFace.name })}
                width={488}
                height={680}
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
          <button type="button" className="panel__close" onClick={onClose}>
            {t('panel.close')}
          </button>
        </div>
      )}
    </dialog>
  );
}
