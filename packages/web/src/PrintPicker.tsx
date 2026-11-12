import {
  allocateEveryCopy,
  allocatePrintCopies,
  copiesAllocatedTo,
  copiesByPrint,
  unallocatedCopies,
  type AllocationChoice,
  type Print,
  type ResolvedLine,
} from '@mtg-suite/core';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { setAndNumberOf } from './print-label.ts';
import { PRINT_TILE_GAP, PRINT_TILE_MIN_WIDTH } from './print-picker-geometry.ts';
import { SMALL_IMAGE } from './scryfall-image-sizes.ts';
import { SECONDARY_BUTTON } from './ui/board-styles.ts';
import type { PrintPages } from './use-print-pages.ts';
import { CARD_SHAPE } from './card-shape.ts';

/** Marks the element that scrolls the print picker: more prints load as its end comes near. */
export const PRINT_PICKER_SCROLL_ROOT = 'data-print-picker-scroll-root';

const COUNTER_BUTTON =
  'grid size-7 place-items-center rounded-sm border-2 border-border bg-panel font-mono font-bold leading-none disabled:opacity-40';

interface PrintPickerProps {
  /** The line whose copies the picker allocates: the prints its copies use are marked. */
  readonly line: ResolvedLine;
  readonly printPages: PrintPages;
  /** Called with the allocations a tap on a print or its +/− counter sets. */
  readonly onAllocationChoice: (allocations: AllocationChoice) => void;
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
export function PrintPicker({ line, printPages, onAllocationChoice }: PrintPickerProps) {
  const { t } = useTranslation();
  const endOfGridRef = useRef<HTMLDivElement>(null);
  const { prints, total, hasMore, isLoading, lastRequestFailed, loadMore } = printPages;

  useEffect(() => {
    const endOfGrid = endOfGridRef.current;
    if (!endOfGrid || !hasMore || lastRequestFailed) return;
    // The panel scrolls, not the page: watch the end of the grid inside it, a little early.
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && loadMore(),
      { root: endOfGrid.closest(`[${PRINT_PICKER_SCROLL_ROOT}]`), rootMargin: '0px 0px 50% 0px' },
    );
    observer.observe(endOfGrid);
    return () => observer.disconnect();
    // A new observer per page: it reports at once if the end is still in sight.
  }, [prints.length, hasMore, lastRequestFailed, loadMore]);

  const printIdsUsedByLine = new Set(copiesByPrint(line).map(({ print }) => print.id));
  const unallocated = unallocatedCopies(line);
  const changeAllocatedCopies = (print: Print, copies: number) =>
    onAllocationChoice(allocatePrintCopies(line, print, copies));

  return (
    <section aria-label={t('printPicker.title', { name: line.card.name })}>
      <h3 className="flex items-baseline justify-between font-semibold">
        {t('panel.prints')}
        {total !== null && (
          <span className="font-mono text-xs text-muted-foreground">
            {t('panel.printCount', { count: total })}
          </span>
        )}
      </h3>
      {byReleaseYear(prints).map(({ year, prints: printsOfYear }) => (
        <section key={year} aria-label={year}>
          <h4 className="mt-3 mb-1.5 font-mono text-xs font-bold">{year}</h4>
          <ul
            className="grid"
            style={{
              gap: PRINT_TILE_GAP,
              gridTemplateColumns: `repeat(auto-fill, minmax(${PRINT_TILE_MIN_WIDTH}px, 1fr))`,
            }}
          >
            {printsOfYear.map((print) => {
              const frontFace = print.faces[0];
              const usedByLine = printIdsUsedByLine.has(print.id);
              const setAndNumber = setAndNumberOf(print, t);
              const allocated = copiesAllocatedTo(line, print);
              const isDefaultPrint = print.id === line.defaultPrint?.id;
              return (
                <li
                  key={print.id}
                  className={`flex flex-col rounded-md border-2 p-1 text-center text-xs ${usedByLine ? 'border-link' : 'border-transparent'}`}
                >
                  <button
                    type="button"
                    className="flex flex-col"
                    aria-pressed={usedByLine}
                    onClick={() => onAllocationChoice(allocateEveryCopy(line, print))}
                  >
                    {frontFace && (
                      <img
                        className="block w-full"
                        style={CARD_SHAPE}
                        src={frontFace.imageUris.small}
                        alt={t('line.imageAlt', { name: frontFace.name })}
                        width={SMALL_IMAGE.width}
                        height={SMALL_IMAGE.height}
                        loading="lazy"
                      />
                    )}
                    <span className="mt-1 font-mono">{setAndNumber}</span>
                    <span className={print.imageStatus === 'lowres' ? 'text-warning' : ''}>
                      {t(`printPicker.quality.${print.imageStatus}`)}
                    </span>
                  </button>
                  <div
                    className="mt-1 flex items-center justify-center gap-1"
                    role="group"
                    aria-label={t('printPicker.copiesOf', { print: setAndNumber })}
                  >
                    <button
                      type="button"
                      className={COUNTER_BUTTON}
                      aria-label={t('printPicker.decrease', { print: setAndNumber })}
                      disabled={allocated === 0}
                      onClick={() => changeAllocatedCopies(print, allocated - 1)}
                    >
                      {t('panel.minus')}
                    </button>
                    <output aria-live="polite" className="min-w-[2ch] font-bold">
                      {allocated}
                    </output>
                    <button
                      type="button"
                      className={COUNTER_BUTTON}
                      aria-label={t('printPicker.increase', { print: setAndNumber })}
                      disabled={unallocated === 0}
                      onClick={() => changeAllocatedCopies(print, allocated + 1)}
                    >
                      {t('panel.plus')}
                    </button>
                  </div>
                  {isDefaultPrint && unallocated > 0 && (
                    <span className="text-muted-foreground">
                      {t('printPicker.unallocated', { count: unallocated })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div ref={endOfGridRef} className="min-h-6 text-muted-foreground" aria-live="polite">
        {isLoading && t('printPicker.loading')}
      </div>
      {lastRequestFailed && (
        <div role="alert">
          <p>{t('printPicker.error')}</p>
          <button type="button" className={SECONDARY_BUTTON} onClick={loadMore}>
            {t('printPicker.retry')}
          </button>
        </div>
      )}
    </section>
  );
}
