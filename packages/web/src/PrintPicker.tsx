import {
  allocateEveryCopy,
  allocatePrintCopies,
  copiesByPrint,
  unallocatedCopies,
  type AllocationChoice,
  type Print,
  type ResolvedLine,
} from '@mtg-suite/core';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { PRINT_TILE_GAP, PRINT_TILE_MIN_WIDTH } from './print-picker-geometry.ts';
import { SMALL_IMAGE } from './scryfall-image-sizes.ts';
import type { PrintPages } from './use-print-pages.ts';

interface PrintPickerProps {
  /** The line whose copies the picker allocates: the prints it uses are marked as picked. */
  readonly line: ResolvedLine;
  readonly printPages: PrintPages;
  /** Called with the allocations a print's +/− counter sets. */
  readonly onAllocationChoice: (allocations: AllocationChoice) => void;
  /** Called with the allocations a tap on a print sets: every copy on that print. */
  readonly onPrintEveryCopy: (allocations: AllocationChoice) => void;
  readonly onBack: () => void;
}

interface ReleaseYear {
  readonly year: string;
  readonly prints: readonly Print[];
}

/** Prints already newest first, cut where the release year changes. */
function byReleaseYear(prints: readonly Print[]): ReleaseYear[] {
  const years: { year: string; prints: Print[] }[] = [];
  for (const print of prints) {
    const year = print.releasedAt.slice(0, 4);
    const last = years.at(-1);
    if (last?.year === year) last.prints.push(print);
    else years.push({ year, prints: [print] });
  }
  return years;
}

/**
 * The grid of the prints a line can use, grouped by release year, newest first. Tapping a print
 * puts every copy on it; its +/− counter moves one copy at a time between it and the default
 * print. More prints load as the user scrolls near the end of the grid.
 */
export function PrintPicker({
  line,
  printPages,
  onAllocationChoice,
  onPrintEveryCopy,
  onBack,
}: PrintPickerProps) {
  const { t } = useTranslation();
  const endOfGridRef = useRef<HTMLDivElement>(null);
  const { prints, hasMore, isLoading, lastRequestFailed, loadMore } = printPages;

  useEffect(() => {
    const endOfGrid = endOfGridRef.current;
    if (!endOfGrid || !hasMore || lastRequestFailed) return;
    // The panel scrolls, not the page: watch the end of the grid inside it, a little early.
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && loadMore(),
      { root: endOfGrid.closest('dialog'), rootMargin: '0px 0px 50% 0px' },
    );
    observer.observe(endOfGrid);
    return () => observer.disconnect();
    // A new observer per page: it reports at once if the end is still in sight.
  }, [prints.length, hasMore, lastRequestFailed, loadMore]);

  const pickedPrintIds = new Set(copiesByPrint(line).map(({ print }) => print.id));
  const unallocated = unallocatedCopies(line);
  const allocatedCopiesOf = (print: Print) =>
    line.allocations.find((allocation) => allocation.print.id === print.id)?.quantity ?? 0;
  const changeAllocatedCopies = (print: Print, copies: number) =>
    onAllocationChoice(allocatePrintCopies(line, print, copies));

  const tileSizes = {
    '--print-tile-min-width': `${PRINT_TILE_MIN_WIDTH}px`,
    '--print-tile-gap': `${PRINT_TILE_GAP}px`,
  } as CSSProperties;

  return (
    <div className="print-picker" style={tileSizes}>
      <div className="print-picker__header">
        <button type="button" className="button--secondary" onClick={onBack}>
          {t('printPicker.back')}
        </button>
        <h2 id="panel-title">{t('printPicker.title', { name: line.card.name })}</h2>
      </div>
      {byReleaseYear(prints).map(({ year, prints: printsOfYear }) => (
        <section key={year} className="print-picker__year" aria-label={year}>
          <h3>{year}</h3>
          <ul className="print-picker__grid">
            {printsOfYear.map((print) => {
              const frontFace = print.faces[0];
              const picked = pickedPrintIds.has(print.id);
              const setAndNumber = t('printPicker.setAndNumber', {
                set: print.set.toUpperCase(),
                number: print.collectorNumber,
              });
              const allocated = allocatedCopiesOf(print);
              const isDefaultPrint = print.id === line.defaultPrint?.id;
              return (
                <li key={print.id} className={`print-tile${picked ? ' print-tile--picked' : ''}`}>
                  <button
                    type="button"
                    className="print-tile__pick"
                    aria-pressed={picked}
                    onClick={() => onPrintEveryCopy(allocateEveryCopy(line, print))}
                  >
                    {frontFace && (
                      <img
                        className="print-tile__image"
                        src={frontFace.imageUris.small}
                        alt={t('line.imageAlt', { name: frontFace.name })}
                        width={SMALL_IMAGE.width}
                        height={SMALL_IMAGE.height}
                        loading="lazy"
                      />
                    )}
                    <span className="print-tile__set">{setAndNumber}</span>
                    <span
                      className={`print-tile__quality print-tile__quality--${print.imageStatus}`}
                    >
                      {t(`printPicker.quality.${print.imageStatus}`)}
                    </span>
                  </button>
                  <div
                    className="print-tile__counter"
                    role="group"
                    aria-label={t('printPicker.copiesOf', { print: setAndNumber })}
                  >
                    <button
                      type="button"
                      aria-label={t('printPicker.decrease', { print: setAndNumber })}
                      disabled={allocated === 0}
                      onClick={() => changeAllocatedCopies(print, allocated - 1)}
                    >
                      {t('panel.minus')}
                    </button>
                    <output aria-live="polite">{allocated}</output>
                    <button
                      type="button"
                      aria-label={t('printPicker.increase', { print: setAndNumber })}
                      disabled={unallocated === 0}
                      onClick={() => changeAllocatedCopies(print, allocated + 1)}
                    >
                      {t('panel.plus')}
                    </button>
                  </div>
                  {isDefaultPrint && unallocated > 0 && (
                    <span className="print-tile__unallocated">
                      {t('printPicker.unallocated', { count: unallocated })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div ref={endOfGridRef} className="print-picker__status" aria-live="polite">
        {isLoading && t('printPicker.loading')}
      </div>
      {lastRequestFailed && (
        <div role="alert">
          <p>{t('printPicker.error')}</p>
          <button type="button" className="button--secondary" onClick={loadMore}>
            {t('printPicker.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
