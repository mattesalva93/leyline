import { printTiles, type ResolvedLine } from '@leyline/core';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyBreakdown } from './CopyBreakdown.tsx';
import { setAndNumberOf } from '../card-image/print-label.ts';
import { BUTTON_STATES } from '../../ui/board-styles.ts';

/**
 * The copy breakdown folded into one line that names each print the copies use, with its
 * language and copies; the user opens it by hand. It opens folded.
 */
export function FoldedCopyBreakdown({
  line,
  openingQuantity,
}: {
  readonly line: ResolvedLine;
  /** How many copies the line printed when its panel opened. */
  readonly openingQuantity: number;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const breakdownId = useId();
  const printSummary = printTiles(line)
    .map(({ print, quantity }) =>
      t('copyBreakdown.printSummary', {
        lang: t(`langCode.${print.lang}`),
        print: setAndNumberOf(print, t),
        count: quantity,
      }),
    )
    .join(t('copyBreakdown.printSummarySeparator'));
  return (
    <div className="flex flex-col gap-2 text-sm">
      <button
        type="button"
        className={`rounded-sm text-left ${BUTTON_STATES}`}
        aria-expanded={isOpen}
        aria-controls={breakdownId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold">{t('copyBreakdown.title')}</span>{' '}
        <span className="font-mono text-muted-foreground">{printSummary}</span>
      </button>
      <div id={breakdownId}>
        {isOpen && <CopyBreakdown line={line} openingQuantity={openingQuantity} hasTitle={false} />}
      </div>
    </div>
  );
}
