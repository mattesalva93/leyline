import { printTiles, type ResolvedLine } from '@leyline/core';
import { useTranslation } from 'react-i18next';
import { setAndNumberOf } from '../card-image/print-label.ts';

interface CopyBreakdownProps {
  readonly line: ResolvedLine;
  /** How many copies the line printed when its panel opened. */
  readonly openingQuantity: number;
  /** False where a title of its own already names the breakdown. */
  readonly hasTitle?: boolean;
}

/**
 * How the line's copies divide among the prints they use, in either language, in the order of
 * its tiles; then the line's total, and how far it moved since the panel opened.
 */
export function CopyBreakdown({ line, openingQuantity, hasTitle = true }: CopyBreakdownProps) {
  const { t } = useTranslation();
  const change = line.quantity - openingQuantity;
  return (
    <section aria-label={t('copyBreakdown.title')} className="flex flex-col gap-1 text-sm">
      {hasTitle && <h3 className="font-semibold">{t('copyBreakdown.title')}</h3>}
      <ul className="flex flex-col gap-0.5">
        {printTiles(line).map(({ print, quantity }) => (
          <li key={print.id} className="grid grid-cols-[1fr_auto_3ch] gap-x-3">
            <span>{t(`lang.${print.lang}`)}</span>
            <span className="font-mono">{setAndNumberOf(print, t)}</span>
            <span className="text-right font-mono font-bold">{quantity}</span>
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap justify-between gap-x-3 border-t-2 border-border pt-1">
        <span className="font-semibold">{t('copyBreakdown.total', { count: line.quantity })}</span>
        {change !== 0 && (
          <span aria-live="polite" className="text-muted-foreground">
            {t('copyBreakdown.changeSinceOpened', {
              change: `${change > 0 ? '+' : '−'}${Math.abs(change)}`,
              count: openingQuantity,
            })}
          </span>
        )}
      </p>
    </section>
  );
}
