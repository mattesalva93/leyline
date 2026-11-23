import {
  moveEveryCopy,
  moveTileCopies,
  copiesByPrint,
  releaseYearOf,
  type AllocationChoice,
  type Print,
  type ResolvedLine,
} from '@mtg-suite/core';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { setAndNumberOf } from '../card-image/print-label.ts';
import {
  gridTemplateColumnsOf,
  PRINT_TILE_GAP,
  type PrintGridColumns,
} from './print-picker-geometry.ts';
import { PRINT_PICKER, PRINT_PICKER_SCROLL_ROOT } from './print-picker-marks.ts';
import { SMALL_IMAGE } from '../card-image/scryfall-image-sizes.ts';
import { BUTTON_STATES, SINKS_WHEN_PRESSED, SECONDARY_BUTTON } from '../../ui/board-styles.ts';
import type { PrintPages } from './use-print-pages.ts';
import type { PrintPickerView } from './use-print-picker-view.ts';
import type { PrintQuery } from './use-print-query.ts';
import { PRINT_PICKER_ZOOM_WAIT_MS, useZoomedCard } from '../zoomed-card/use-zoomed-card.tsx';

const COUNTER_BUTTON = `grid size-7 place-items-center rounded-sm border-2 border-border bg-panel font-mono font-bold leading-none disabled:opacity-40 ${BUTTON_STATES}`;

export interface PrintGridProps {
  /** The line whose copies the grid allocates: the prints its copies use are marked. */
  readonly line: ResolvedLine;
  /** The print of the tile the picker was opened from: a tap moves its copies; `null` for none. */
  readonly tilePrint: Print | null;
  /** The print to bring into view. */
  readonly pickerView: Pick<PrintPickerView, 'printToShow' | 'onPrintShown'>;
  /** What the user typed to narrow the prints, which `printPages` are already narrowed by. */
  readonly printQuery: PrintQuery;
  /** The prints of the card in the picker view's language: copies can go to prints of either one. */
  readonly printPages: PrintPages;
  readonly columns: PrintGridColumns;
  /** Called with the choice a tap on `toPrint` sets: the tile's copies moved onto it. */
  readonly onTileCopiesMove: (choice: AllocationChoice, toPrint: Print) => void;
  /** Called by a print's +/− counter with the copies it now prints, the line's changing as many. */
  readonly onPrintQuantityChange: (print: Print, quantity: number) => void;
}

interface ReleaseYear {
  readonly year: string;
  readonly prints: readonly Print[];
}

/** Prints already newest first, cut where the release year changes. */
function byReleaseYear(prints: readonly Print[]): ReleaseYear[] {
  const years: { year: string; prints: Print[] }[] = [];
  for (const print of prints) {
    const year = releaseYearOf(print);
    const last = years.at(-1);
    if (last?.year === year) last.prints.push(print);
    else years.push({ year, prints: [print] });
  }
  return years;
}

/**
 * The grid of the prints a line can use, grouped by release year, newest first. Tapping a print
 * moves the copies of the tile the picker was opened from onto it; its +/− counter adds or takes
 * off one copy of the line on that print. More prints load as the user scrolls near the end of
 * the grid, or until the print to show is among them. A print the pointer rests on shows
 * enlarged beside the picker.
 */
export function PrintGrid({
  line,
  tilePrint,
  pickerView: { printToShow, onPrintShown },
  printQuery,
  printPages,
  columns,
  onTileCopiesMove,
  onPrintQuantityChange,
}: PrintGridProps) {
  const { t } = useTranslation();
  const endOfGridRef = useRef<HTMLDivElement>(null);
  const printButtons = useRef(new Map<string, HTMLButtonElement>());
  const { zoomOn, zoomedCard } = useZoomedCard(PRINT_PICKER_ZOOM_WAIT_MS);
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

  // Loads page after page until the print to show is among them, then brings it into view.
  useEffect(() => {
    if (printToShow === null) return;
    const button = printButtons.current.get(printToShow);
    if (button) {
      // The whole tile, so its counter shows too, not only the button over its image.
      (button.closest('li') ?? button).scrollIntoView({ block: 'nearest' });
      button.focus({ preventScroll: true });
      onPrintShown();
    } else if (!hasMore) onPrintShown();
    else if (!isLoading && !lastRequestFailed) loadMore();
  }, [printToShow, prints, hasMore, isLoading, lastRequestFailed, loadMore, onPrintShown]);

  const copiesOfEachPrint = new Map(
    copiesByPrint(line).map(({ print, quantity }) => [print.id, quantity]),
  );

  return (
    <>
      {printQuery.searched !== '' && total === 0 && (
        <p className="mt-3 text-muted-foreground">
          {t('printPicker.noMatch', { query: printQuery.searched })}
        </p>
      )}
      {byReleaseYear(prints).map(({ year, prints: printsOfYear }) => (
        <section key={year} aria-label={year}>
          <h4 className="mt-3 mb-1.5 font-mono text-xs font-bold">{year}</h4>
          <ul
            className="grid"
            style={{ gap: PRINT_TILE_GAP, gridTemplateColumns: gridTemplateColumnsOf(columns) }}
          >
            {printsOfYear.map((print) => {
              const frontFace = print.faces[0];
              const copies = copiesOfEachPrint.get(print.id) ?? 0;
              const usedByLine = copies > 0;
              const setAndNumber = setAndNumberOf(print, t);
              return (
                <li
                  key={print.id}
                  className={`flex flex-col rounded-md border-2 p-1 text-center text-xs ${usedByLine ? 'border-link' : 'border-transparent'}`}
                >
                  <button
                    type="button"
                    className={`flex flex-col ${SINKS_WHEN_PRESSED}`}
                    aria-pressed={usedByLine}
                    ref={(element) => {
                      if (element) printButtons.current.set(print.id, element);
                      else printButtons.current.delete(print.id);
                    }}
                    onClick={() =>
                      onTileCopiesMove(
                        tilePrint
                          ? moveTileCopies(line, tilePrint, print)
                          : moveEveryCopy(line, print),
                        print,
                      )
                    }
                    // Beside the whole picker, so the zoomed card hides none of the other prints.
                    {...zoomOn(frontFace, `[${PRINT_PICKER}]`)}
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
                      disabled={copies === 0 || line.quantity <= 1}
                      onClick={() => onPrintQuantityChange(print, copies - 1)}
                    >
                      {t('panel.minus')}
                    </button>
                    <output aria-live="polite" className="min-w-[2ch] font-bold">
                      {copies}
                    </output>
                    <button
                      type="button"
                      className={COUNTER_BUTTON}
                      aria-label={t('printPicker.increase', { print: setAndNumber })}
                      onClick={() => onPrintQuantityChange(print, copies + 1)}
                    >
                      {t('panel.plus')}
                    </button>
                  </div>
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
      {zoomedCard}
    </>
  );
}
