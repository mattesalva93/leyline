import { previewPrint, type AllocationChoice, type Lang, type ResolvedLine } from '@mtg-suite/core';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from './LanguagePicker.tsx';
import { contentWidthOf, printPageSize } from './print-picker-geometry.ts';
import { PrintPicker } from './PrintPicker.tsx';
import { PrintWarningNote } from './PrintWarningNote.tsx';
import { NORMAL_IMAGE } from './scryfall-image-sizes.ts';
import { SYMBOL_BUTTON } from './ui/board-styles.ts';
import { usePrintPages } from './use-print-pages.ts';

interface LinePanelProps {
  readonly line: ResolvedLine;
  readonly onLanguageChange: (lang: Lang) => void;
  readonly onQuantityChange: (quantity: number) => void;
  /** Called with the allocations the user set in the print picker. */
  readonly onAllocationChoice: (allocations: AllocationChoice) => void;
}

/** The settings of one line: its language, its quantity and the prints its copies use. */
export function LinePanel({
  line,
  onLanguageChange,
  onQuantityChange,
  onAllocationChoice,
}: LinePanelProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const printPages = usePrintPages(line.card.oracleId, line.lang, () => {
    const panel = panelRef.current;
    const gridWidth = panel ? contentWidthOf(panel) : window.innerWidth;
    return printPageSize(gridWidth, window.innerHeight);
  });
  const frontFace = previewPrint(line)?.faces[0];
  return (
    <div ref={panelRef} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {frontFace && (
          <img
            className="w-20 shrink-0 card-shape"
            src={frontFace.imageUris.normal}
            alt={t('line.imageAlt', { name: frontFace.name })}
            width={NORMAL_IMAGE.width}
            height={NORMAL_IMAGE.height}
          />
        )}
        <h3 className="text-lg leading-tight font-bold">{line.card.name}</h3>
      </div>
      <LanguagePicker
        label={t('panel.lang')}
        selectedLang={line.lang}
        onChange={onLanguageChange}
      />
      <PrintWarningNote line={line} onSwitchLineToEnglish={() => onLanguageChange('en')} />
      <fieldset className="flex items-center gap-2">
        <legend className="float-left mr-3 font-semibold">{t('panel.quantity')}</legend>
        <button
          type="button"
          className={SYMBOL_BUTTON}
          aria-label={t('panel.decrease')}
          disabled={line.quantity <= 1}
          onClick={() => onQuantityChange(line.quantity - 1)}
        >
          {t('panel.minus')}
        </button>
        <output aria-live="polite" className="min-w-[2ch] text-center font-mono font-bold">
          {line.quantity}
        </output>
        <button
          type="button"
          className={SYMBOL_BUTTON}
          aria-label={t('panel.increase')}
          onClick={() => onQuantityChange(line.quantity + 1)}
        >
          {t('panel.plus')}
        </button>
      </fieldset>
      <PrintPicker line={line} printPages={printPages} onAllocationChoice={onAllocationChoice} />
    </div>
  );
}
